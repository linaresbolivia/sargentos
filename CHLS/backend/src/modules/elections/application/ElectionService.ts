import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
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
          maxSelectionsPerBallot: 11,
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
   * Obtiene los datos completos y estadísticas de una elección específica
   */
  public async getElectionById(id: string) {
    const election = await this.prisma.election.findUnique({
      where: { id },
      include: {
        candidates: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!election) {
      throw new Error('Votación no encontrada.');
    }

    const stats = await this.getLiveStats(election.id);
    return {
      election,
      stats,
    };
  }

  /**
   * Obtiene el historial completo de todas las votaciones registradas en el sistema,
   * ordenadas cronológicamente por fecha de votación (startDate / createdAt)
   */
  public async getElectionHistory() {
    const elections = await this.prisma.election.findMany({
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        candidates: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    const activeElection = await this.prisma.election.findFirst({
      where: { status: 'EN_CURSO' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    const historyItems = await Promise.all(
      elections.map(async (elec) => {
        const stats = await this.getLiveStats(elec.id);
        const winningCandidate =
          stats.candidates && stats.candidates.length > 0 ? stats.candidates[0] : null;

        return {
          id: elec.id,
          title: elec.title,
          description: elec.description,
          period: elec.period,
          status: elec.status as ElectionStatus,
          startDate: elec.startDate,
          endDate: elec.endDate,
          votingDate: elec.startDate,
          quorumMinimum: elec.quorumMinimum,
          maxSelectionsPerBallot: elec.maxSelectionsPerBallot,
          totalBallots: stats.totalBallots,
          validBallots: stats.validBallots,
          blankBallots: stats.blankBallots,
          nullBallots: stats.nullBallots,
          validPercentage: stats.validPercentage,
          blankPercentage: stats.blankPercentage,
          nullPercentage: stats.nullPercentage,
          totalVotesAccumulated: stats.totalVotesAccumulated,
          candidatesCount: elec.candidates.length,
          winningCandidate: winningCandidate
            ? {
                id: winningCandidate.id,
                fullName: winningCandidate.fullName,
                photoUrl: winningCandidate.photoUrl,
                votesCount: winningCandidate.votesCount,
                votesPercentage: winningCandidate.votesPercentage,
              }
            : null,
          topCandidates: stats.candidates.slice(0, 3).map((c) => ({
            id: c.id,
            fullName: c.fullName,
            votesCount: c.votesCount,
            votesPercentage: c.votesPercentage,
            photoUrl: c.photoUrl,
          })),
          createdAt: elec.createdAt,
          updatedAt: elec.updatedAt,
          isCurrent: activeElection ? activeElection.id === elec.id : false,
        };
      })
    );

    return historyItems;
  }

  /**
   * Cierra y guarda oficialmente la votación por fecha de votación
   */
  public async closeElection(
    electionId: string,
    options: {
      votingDate?: string | Date;
      notes?: string;
      signers?: Array<{ name: string; ci: string; role: string }>;
      performedBy?: string;
    }
  ) {
    const targetDate = options.votingDate ? new Date(options.votingDate) : new Date();

    const updated = await this.prisma.election.update({
      where: { id: electionId },
      data: {
        status: 'FINALIZADA',
        startDate: options.votingDate ? targetDate : undefined,
        endDate: targetDate,
        description: options.notes ? options.notes : undefined,
        closingActUrl: options.signers ? JSON.stringify(options.signers) : undefined,
      },
      include: {
        candidates: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    await this.prisma.electionAuditLog.create({
      data: {
        electionId,
        action: 'CIERRE_VOTACION',
        details: `Votación cerrada y guardada oficialmente con fecha de votación: ${targetDate.toISOString().split('T')[0]}. ${options.notes || ''}`.trim(),
        performedBy: options.performedBy || 'Comité Electoral',
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
        io.emit('elections:closed', {
          electionId,
          votingDate: targetDate,
          stats,
        });
      }
    } catch (e) {
      logger.warn('Socket error on election close:', e);
    }

    return { success: true, election: updated, stats };
  }

  /**
   * Reabre una votación cerrada para permitir continuar el escrutinio
   */
  public async reopenElection(electionId: string, performedBy?: string) {
    const updated = await this.prisma.election.update({
      where: { id: electionId },
      data: {
        status: 'EN_CURSO',
      },
      include: {
        candidates: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    await this.prisma.electionAuditLog.create({
      data: {
        electionId,
        action: 'REAPERTURA_VOTACION',
        details: 'La votación fue reabierta para el registro de boletas.',
        performedBy: performedBy || 'Comité Electoral',
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
        io.emit('elections:reopened', {
          electionId,
          stats,
        });
      }
    } catch (e) {
      logger.warn('Socket error on election reopen:', e);
    }

    return { success: true, election: updated, stats };
  }

  /**
   * Crea una nueva votación en el historial, permitiendo reiniciar con el ánfora limpia
   * y opcionalmente copiar la nómina de candidatos previa
   */
  public async createNewElection(data: {
    title: string;
    period?: string;
    votingDate?: string | Date;
    description?: string;
    maxSelectionsPerBallot?: number;
    quorumMinimum?: number;
    copyCandidatesFromElectionId?: string;
    closePrevious?: boolean;
    performedBy?: string;
  }) {
    // Si se indicó cerrar la anterior, cerramos las que estén EN_CURSO
    if (data.closePrevious) {
      const currentActive = await this.prisma.election.findMany({
        where: { status: 'EN_CURSO' },
      });
      for (const cur of currentActive) {
        await this.prisma.election.update({
          where: { id: cur.id },
          data: { status: 'FINALIZADA', endDate: new Date() },
        });
      }
    }

    const vDate = data.votingDate ? new Date(data.votingDate) : new Date();

    const newElection = await this.prisma.election.create({
      data: {
        title: data.title,
        description: data.description || 'Nueva jornada electoral del Club Hípico Los Sargentos.',
        period: data.period || `${vDate.getFullYear()}-${vDate.getFullYear() + 2}`,
        status: 'EN_CURSO',
        startDate: vDate,
        endDate: new Date(vDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        maxSelectionsPerBallot: data.maxSelectionsPerBallot || 11,
        quorumMinimum: data.quorumMinimum || 25,
      },
    });

    // Copiar candidatos si se especificó
    if (data.copyCandidatesFromElectionId) {
      const sourceCandidates = await this.prisma.electionCandidate.findMany({
        where: {
          electionId: data.copyCandidatesFromElectionId,
          isActive: true,
        },
        orderBy: { orderIndex: 'asc' },
      });

      for (const cand of sourceCandidates) {
        await this.prisma.electionCandidate.create({
          data: {
            electionId: newElection.id,
            fullName: cand.fullName,
            position: cand.position,
            membershipNumber: cand.membershipNumber,
            photoUrl: cand.photoUrl,
            bio: cand.bio,
            colorHex: cand.colorHex,
            orderIndex: cand.orderIndex,
            isActive: true,
          },
        });
      }
    }

    await this.prisma.electionAuditLog.create({
      data: {
        electionId: newElection.id,
        action: 'APERTURA_NUEVA_VOTACION',
        details: `Se aperturó una nueva sesión de votación: "${data.title}" con fecha ${vDate.toISOString().split('T')[0]}.`,
        performedBy: data.performedBy || 'Comité Electoral',
      },
    });

    const fullElection = await this.prisma.election.findUnique({
      where: { id: newElection.id },
      include: {
        candidates: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    const stats = await this.getLiveStats(newElection.id);

    try {
      const io = socketService.getIo();
      if (io) {
        io.emit('elections:settings_updated', {
          settings: fullElection,
          stats,
        });
        io.emit('elections:new_session', {
          election: fullElection,
          stats,
        });
      }
    } catch (e) {
      logger.warn('Socket error on new election creation:', e);
    }

    return {
      success: true,
      election: fullElection,
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
    let finalPhotoUrl = candidate.photoUrl || null;
    if (finalPhotoUrl && finalPhotoUrl.startsWith('data:image')) {
      try {
        const uploadsDir = path.join(process.cwd(), 'uploads', 'elections');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const base64Data = finalPhotoUrl.split(',')[1];
        const origBuf = Buffer.from(base64Data, 'base64');
        const fileName = `cand_${candidate.orderIndex || 0}_${Date.now()}.webp`;
        const filePath = path.join(uploadsDir, fileName);

        await sharp(origBuf)
          .rotate()
          .resize(640, 640, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85, effort: 4 })
          .toFile(filePath);

        finalPhotoUrl = `/uploads/elections/${fileName}`;
      } catch (err) {
        logger.error('Error al optimizar foto de candidato:', err);
      }
    }

    let saved;
    if (candidate.id) {
      if (finalPhotoUrl) {
        try {
          const prev = await this.prisma.electionCandidate.findUnique({
            where: { id: candidate.id },
            select: { photoUrl: true }
          });
          if (prev?.photoUrl && prev.photoUrl !== finalPhotoUrl && prev.photoUrl.startsWith('/uploads/elections/')) {
            const oldPath = path.join(process.cwd(), prev.photoUrl.replace(/^\//, ''));
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          }
        } catch (_) {}
      }

      saved = await this.prisma.electionCandidate.update({
        where: { id: candidate.id },
        data: {
          fullName: candidate.fullName,
          position: candidate.position || 'Postulante al Directorio',
          photoUrl: finalPhotoUrl,
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
          photoUrl: finalPhotoUrl,
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

  /**
   * Obtiene todos los datos detallados para la exportación oficial (PDF y Excel):
   * Elección, estadísticas agregadas, candidatos y todas las boletas sufragadas con nombres de postulantes.
   */
  public async getDetailedReport(electionId?: string) {
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
      throw new Error('No se encontró ninguna elección activa.');
    }

    const stats = await this.getLiveStats(election.id);

    // Mapeo de IDs de candidatos a nombres para enriquecer cada boleta
    const candidateMap = new Map<string, { fullName: string; orderIndex: number; position: string }>();
    election.candidates.forEach((c) => {
      candidateMap.set(c.id, {
        fullName: c.fullName,
        orderIndex: c.orderIndex,
        position: c.position,
      });
    });

    // Obtener todas las boletas físicas ordenadas correlativamente
    const rawBallots = await this.prisma.electionBallot.findMany({
      where: { electionId: election.id },
      orderBy: { ballotNumber: 'asc' },
    });

    const ballots = rawBallots.map((b) => {
      const selectedNames = b.selectedCandidateIds
        .map((id) => candidateMap.get(id)?.fullName || id)
        .filter(Boolean);

      return {
        id: b.id,
        ballotNumber: b.ballotNumber,
        ballotType: b.ballotType,
        selectedCandidateIds: b.selectedCandidateIds,
        selectedCandidateNames: selectedNames,
        marksCount: b.selectedCandidateIds.length,
        notes: b.notes,
        registeredBy: b.registeredBy,
        voteHash: b.voteHash,
        castAt: b.castAt,
        createdAt: b.castAt,
      };
    });

    let signers: Array<{ name: string; ci: string; role: string }> = [];
    if (election.closingActUrl) {
      try {
        const parsed = JSON.parse(election.closingActUrl);
        if (Array.isArray(parsed)) {
          signers = parsed;
        }
      } catch {
        // not json
      }
    }

    return {
      election: {
        id: election.id,
        title: election.title,
        period: election.period,
        status: election.status,
        createdAt: election.createdAt,
        quorumMinimum: election.quorumMinimum,
        signers,
      },
      stats,
      ballots,
      candidates: election.candidates.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        orderIndex: c.orderIndex,
        position: c.position,
        votesCount: stats.candidates.find((sc) => sc.id === c.id)?.votesCount || 0,
        votesPercentage: stats.candidates.find((sc) => sc.id === c.id)?.votesPercentage || 0,
        votesPercentageValid: stats.candidates.find((sc) => sc.id === c.id)?.votesPercentageValid || 0,
        rank: stats.candidates.find((sc) => sc.id === c.id)?.rank || 0,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Elimina permanentemente una votación y sus registros asociados
   */
  public async deleteElection(electionId: string) {
    const election = await this.prisma.election.findUnique({
      where: { id: electionId },
      include: { candidates: true },
    });
    if (!election) {
      throw new Error('Votación no encontrada.');
    }

    // Limpiar archivos locales si los hubiera
    for (const cand of election.candidates) {
      if (cand.photoUrl && cand.photoUrl.startsWith('/uploads/elections/')) {
        const filePath = path.join(process.cwd(), cand.photoUrl.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (_) {}
        }
      }
    }

    await this.prisma.election.delete({
      where: { id: electionId },
    });

    return { success: true, message: 'Votación eliminada exitosamente' };
  }
}

