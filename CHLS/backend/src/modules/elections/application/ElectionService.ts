import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { socketService } from '@config/socket';
import { logger } from '@config/logger';
import {
  CandidateDto,
  ElectionStatsDto,
  ElectionStatus,
  RegisterBallotInput,
} from '../domain/election.types';

export class ElectionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Obtiene la elección activa con su lista de candidatos parametrizados
   */
  public async getActiveElection() {
    let election = await this.prisma.election.findFirst({
      where: {
        status: { in: ['EN_CURSO', 'CONVOCADA', 'FINALIZADA', 'PROCLAMADA'] },
      },
      orderBy: [
        { status: 'asc' }, // Prioriza EN_CURSO
        { createdAt: 'desc' },
      ],
      include: {
        candidates: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // Si no existe, crear la elección por defecto
    if (!election) {
      election = await this.prisma.election.create({
        data: {
          title: 'Elecciones Ordinarias de Directorio 2026 - 2028',
          description:
            'Cómputo oficial en vivo de papeletas físicas sufragadas en ánfora para la renovación del Directorio del Club Hípico Los Sargentos.',
          period: '2026-2028',
          status: 'EN_CURSO',
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          quorumMinimum: 25,
          maxSelectionsPerBallot: 5,
        },
        include: {
          candidates: true,
        },
      });
    }

    const stats = await this.getLiveStats(election.id);
    return {
      election,
      stats,
    };
  }

  /**
   * Calcula el escrutinio en vivo en base al total de boletas físicas registradas del ánfora
   */
  public async getLiveStats(electionId?: string): Promise<ElectionStatsDto> {
    const election = electionId
      ? await this.prisma.election.findUnique({
          where: { id: electionId },
          include: {
            candidates: {
              where: { isActive: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
        })
      : await this.prisma.election.findFirst({
          where: { status: { in: ['EN_CURSO', 'CONVOCADA', 'FINALIZADA', 'PROCLAMADA'] } },
          orderBy: { createdAt: 'desc' },
          include: {
            candidates: {
              where: { isActive: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
        });

    if (!election) {
      throw new Error('No se encontró ninguna elección configurada.');
    }

    // Obtener campos indispensables para cómputo de alta velocidad
    const ballots = await this.prisma.electionBallot.findMany({
      where: { electionId: election.id },
      select: {
        ballotType: true,
        selectedCandidateIds: true,
      },
    });

    const totalBallots = ballots.length;
    let validBallots = 0;
    let blankBallots = 0;
    let nullBallots = 0;
    let totalVotesAccumulated = 0;

    // Mapa de conteo de votos por candidato
    const candidateVotesMap = new Map<string, number>();
    election.candidates.forEach((c) => candidateVotesMap.set(c.id, 0));

    for (const b of ballots) {
      if (b.ballotType === 'BLANK') {
        blankBallots++;
      } else if (b.ballotType === 'NULL') {
        nullBallots++;
      } else {
        validBallots++;
        if (Array.isArray(b.selectedCandidateIds)) {
          for (const candId of b.selectedCandidateIds) {
            if (candidateVotesMap.has(candId)) {
              candidateVotesMap.set(candId, (candidateVotesMap.get(candId) || 0) + 1);
              totalVotesAccumulated++;
            }
          }
        }
      }
    }

    // Mapear candidatos con sus votos y calcular porcentaje en base a totalBallots
    const candidatesWithStats: CandidateDto[] = election.candidates.map((c) => {
      const votes = candidateVotesMap.get(c.id) || 0;
      // Porcentaje calculado en base a la cantidad de boletas registradas
      const votesPercentage =
        totalBallots > 0 ? Number(((votes / totalBallots) * 100).toFixed(1)) : 0;
      const votesPercentageValid =
        validBallots > 0 ? Number(((votes / validBallots) * 100).toFixed(1)) : 0;

      return {
        id: c.id,
        fullName: c.fullName,
        position: c.position || 'Postulante al Directorio',
        membershipNumber: c.membershipNumber || undefined,
        photoUrl: c.photoUrl || undefined,
        bio: c.bio || undefined,
        colorHex: c.colorHex || '#0b532c',
        orderIndex: c.orderIndex,
        isActive: c.isActive,
        votesCount: votes,
        votesPercentage,
        votesPercentageValid,
      };
    });

    // Ordenar de mayor a menor para asignar ranking
    const sortedCandidates = [...candidatesWithStats].sort(
      (a, b) => (b.votesCount || 0) - (a.votesCount || 0)
    );

    sortedCandidates.forEach((c, idx) => {
      c.rank = idx + 1;
    });

    // Mantener orden de ranking para la lista
    const winningCandidateId =
      totalBallots > 0 && sortedCandidates.length > 0 ? sortedCandidates[0].id : null;

    return {
      electionId: election.id,
      electionTitle: election.title,
      period: election.period,
      status: election.status as ElectionStatus,
      quorumMinimum: election.quorumMinimum,
      maxSelectionsPerBallot: election.maxSelectionsPerBallot,
      totalBallots,
      validBallots,
      validPercentage:
        totalBallots > 0 ? Number(((validBallots / totalBallots) * 100).toFixed(1)) : 0,
      blankBallots,
      blankPercentage:
        totalBallots > 0 ? Number(((blankBallots / totalBallots) * 100).toFixed(1)) : 0,
      nullBallots,
      nullPercentage:
        totalBallots > 0 ? Number(((nullBallots / totalBallots) * 100).toFixed(1)) : 0,
      totalVotesAccumulated,
      candidates: sortedCandidates,
      winningCandidateId,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Registra una boleta física sacada del ánfora una a una
   */
  public async registerBallot(input: RegisterBallotInput) {
    const election = await this.prisma.election.findUnique({
      where: { id: input.electionId },
    });

    if (!election) {
      throw new Error('La elección especificada no existe.');
    }

    if (election.status !== 'EN_CURSO') {
      throw new Error(`Las mesas de votación no están en curso (Estado: ${election.status}).`);
    }

    // Calcular correlativo de la boleta en el ánfora
    const count = await this.prisma.electionBallot.count({
      where: { electionId: input.electionId },
    });
    const ballotNumber = count + 1;

    // Generar hash de integridad
    const salt = crypto.randomBytes(8).toString('hex');
    const voteHash = crypto
      .createHash('sha256')
      .update(`${input.electionId}:${ballotNumber}:${input.ballotType}:${salt}:${Date.now()}`)
      .digest('hex');

    const ballot = await this.prisma.electionBallot.create({
      data: {
        electionId: input.electionId,
        ballotNumber,
        ballotType: input.ballotType,
        selectedCandidateIds:
          input.ballotType === 'VALID' ? input.selectedCandidateIds || [] : [],
        notes: input.notes || null,
        registeredBy: input.registeredBy || 'MESA_CENTRAL',
        voteHash,
      },
    });

    // Calcular estadísticas actualizadas
    const updatedStats = await this.getLiveStats(election.id);

    // Emitir por WebSockets a todas las pantallas conectadas
    try {
      const io = socketService.getIo();
      if (io) {
        io.emit('elections:ballot_registered', {
          ballotNumber,
          ballotType: input.ballotType,
          selectedCandidateIds: input.selectedCandidateIds,
          stats: updatedStats,
        });
      }
    } catch (e) {
      logger.warn('Socket error on ballot registered:', e);
    }

    return {
      success: true,
      ballot,
      stats: updatedStats,
    };
  }

  /**
   * Deshace la última boleta registrada en caso de error del operador
   */
  public async undoLastBallot(electionId: string) {
    const lastBallot = await this.prisma.electionBallot.findFirst({
      where: { electionId },
      orderBy: { ballotNumber: 'desc' },
    });

    if (!lastBallot) {
      throw new Error('No hay ninguna boleta registrada para deshacer.');
    }

    await this.prisma.electionBallot.delete({
      where: { id: lastBallot.id },
    });

    const updatedStats = await this.getLiveStats(electionId);

    try {
      const io = socketService.getIo();
      if (io) {
        io.emit('elections:ballot_undone', {
          undoneBallotNumber: lastBallot.ballotNumber,
          stats: updatedStats,
        });
      }
    } catch (e) {
      logger.warn('Socket error on undo ballot:', e);
    }

    return {
      success: true,
      undoneBallotNumber: lastBallot.ballotNumber,
      stats: updatedStats,
    };
  }

  /**
   * Reinicia el cómputo de boletas (para simulacro o inicio de escrutinio oficial)
   */
  public async resetAllBallots(electionId: string, performedBy?: string) {
    await this.prisma.electionBallot.deleteMany({
      where: { electionId },
    });

    await this.prisma.electionAuditLog.create({
      data: {
        electionId,
        action: 'REINICIO_ESCRUTINIO',
        details: 'Se reinició el contador de boletas del ánfora a 0.',
        performedBy: performedBy || 'Comité Electoral',
      },
    });

    const updatedStats = await this.getLiveStats(electionId);

    try {
      const io = socketService.getIo();
      if (io) {
        io.emit('elections:ballots_reset', {
          stats: updatedStats,
        });
      }
    } catch (e) {
      logger.warn('Socket error on reset:', e);
    }

    return { success: true, stats: updatedStats };
  }

  /**
   * Guarda o actualiza la lista de candidatos parametrizados (hasta 15 candidatos)
   */
  public async saveCandidate(
    electionId: string,
    candidate: {
      id?: string;
      fullName: string;
      position?: string;
      photoUrl?: string;
      colorHex?: string;
      orderIndex?: number;
      membershipNumber?: string;
    }
  ) {
    let saved;
    if (candidate.id) {
      saved = await this.prisma.electionCandidate.update({
        where: { id: candidate.id },
        data: {
          fullName: candidate.fullName,
          position: candidate.position || 'Postulante al Directorio',
          photoUrl: candidate.photoUrl || null,
          colorHex: candidate.colorHex || '#0b532c',
          orderIndex: candidate.orderIndex || 1,
          membershipNumber: candidate.membershipNumber || null,
        },
      });
    } else {
      const currentCount = await this.prisma.electionCandidate.count({
        where: { electionId, isActive: true },
      });
      if (currentCount >= 15) {
        throw new Error('El sistema está configurado para un máximo de 15 postulantes.');
      }
      saved = await this.prisma.electionCandidate.create({
        data: {
          electionId,
          fullName: candidate.fullName,
          position: candidate.position || 'Postulante al Directorio',
          photoUrl: candidate.photoUrl || null,
          colorHex: candidate.colorHex || '#0b532c',
          orderIndex: candidate.orderIndex || currentCount + 1,
          membershipNumber: candidate.membershipNumber || null,
          isActive: true,
        },
      });
    }

    const updatedStats = await this.getLiveStats(electionId);
    try {
      const io = socketService.getIo();
      if (io) {
        io.emit('elections:settings_updated', { stats: updatedStats });
      }
    } catch (e) {
      logger.warn('Socket error on save candidate:', e);
    }

    return { candidate: saved, stats: updatedStats };
  }

  /**
   * Elimina o desactiva un postulante
   */
  public async removeCandidate(candidateId: string) {
    const cand = await this.prisma.electionCandidate.findUnique({
      where: { id: candidateId },
    });
    if (!cand) throw new Error('Postulante no encontrado.');

    await this.prisma.electionCandidate.update({
      where: { id: candidateId },
      data: { isActive: false },
    });

    const updatedStats = await this.getLiveStats(cand.electionId);
    try {
      const io = socketService.getIo();
      if (io) {
        io.emit('elections:settings_updated', { stats: updatedStats });
      }
    } catch (e) {
      logger.warn('Socket error on remove candidate:', e);
    }

    return { success: true, stats: updatedStats };
  }

  /**
   * Configuración de la elección (límite de marcas, título, estado)
   */
  public async updateSettings(
    electionId: string,
    settings: {
      title?: string;
      period?: string;
      status?: ElectionStatus;
      maxSelectionsPerBallot?: number;
      quorumMinimum?: number;
    }
  ) {
    const updated = await this.prisma.election.update({
      where: { id: electionId },
      data: {
        title: settings.title,
        period: settings.period,
        status: settings.status,
        maxSelectionsPerBallot: settings.maxSelectionsPerBallot,
        quorumMinimum: settings.quorumMinimum,
      },
    });

    const stats = await this.getLiveStats(electionId);

    try {
      const io = socketService.getIo();
      if (io) {
        io.emit('elections:settings_updated', {
          settings: updated,
          stats,
        });
      }
    } catch (e) {
      logger.warn('Socket error on settings update:', e);
    }

    return { election: updated, stats };
  }
}
