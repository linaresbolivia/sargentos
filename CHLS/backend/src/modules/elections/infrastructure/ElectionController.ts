import { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ElectionService } from '../application/ElectionService';
import { logger } from '@config/logger';

export class ElectionController {
  public router: Router;
  private electionService: ElectionService;

  constructor(private prisma: PrismaClient = new PrismaClient()) {
    this.router = Router();
    this.electionService = new ElectionService(prisma);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // 1. Elección activa y estadísticas
    this.router.get('/active', this.getActiveElection.bind(this));
    this.router.get('/results', this.getLiveResults.bind(this));
    this.router.get('/report', this.getDetailedReport.bind(this));
    this.router.get('/history', this.getElectionHistory.bind(this));
    this.router.get('/:id', this.getElectionById.bind(this));

    // 2. Registro de boletas físicas sacadas del ánfora
    this.router.post('/ballot', this.registerBallot.bind(this));
    this.router.post('/ballot/undo', this.undoLastBallot.bind(this));
    this.router.post('/ballot/reset', this.resetAllBallots.bind(this));

    // 3. Parametrización de postulantes (hasta 15)
    this.router.post('/candidate', this.saveCandidate.bind(this));
    this.router.delete('/candidate/:id', this.removeCandidate.bind(this));

    // 4. Configuración general (límites de marcas, estados)
    this.router.post('/settings', this.updateSettings.bind(this));

    // 5. Cierre, Guardado e Historial de Sesiones Electorales
    this.router.post('/close', this.closeElection.bind(this));
    this.router.post('/reopen', this.reopenElection.bind(this));
    this.router.post('/new', this.createNewElection.bind(this));
  }

  /**
   * GET /api/elections/report?electionId=...
   * Retorna toda la información detallada para exportación oficial (PDF y Excel)
   */
  private async getDetailedReport(req: Request, res: Response): Promise<void> {
    try {
      const electionId = req.query.electionId ? String(req.query.electionId) : undefined;
      const report = await this.electionService.getDetailedReport(electionId);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      logger.error('Error al generar reporte de elecciones:', error);
      res.status(500).json({ success: false, message: error.message || 'Error interno' });
    }
  }

  /**
   * GET /api/elections/active
   */
  private async getActiveElection(_req: Request, res: Response): Promise<void> {
    try {
      const data = await this.electionService.getActiveElection();
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      logger.error('Error al obtener elección activa:', error);
      res.status(500).json({ success: false, message: error.message || 'Error interno' });
    }
  }

  /**
   * GET /api/elections/results?electionId=...
   */
  private async getLiveResults(req: Request, res: Response): Promise<void> {
    try {
      const electionId = req.query.electionId ? String(req.query.electionId) : undefined;
      const stats = await this.electionService.getLiveStats(electionId);
      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      logger.error('Error al obtener escrutinio en vivo:', error);
      res.status(500).json({ success: false, message: error.message || 'Error interno' });
    }
  }

  /**
   * POST /api/elections/ballot
   * Registra una boleta física sacada del ánfora
   */
  private async registerBallot(req: Request, res: Response): Promise<void> {
    try {
      const { electionId, ballotType, selectedCandidateIds, notes, registeredBy } = req.body;

      if (!electionId) {
        res.status(400).json({ success: false, message: 'Debe especificar electionId.' });
        return;
      }

      const result = await this.electionService.registerBallot({
        electionId,
        ballotType: ballotType || 'VALID',
        selectedCandidateIds: selectedCandidateIds || [],
        notes,
        registeredBy,
      });

      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error al registrar boleta:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/elections/ballot/undo
   * Deshace la última boleta registrada
   */
  private async undoLastBallot(req: Request, res: Response): Promise<void> {
    try {
      const { electionId } = req.body;
      if (!electionId) {
        res.status(400).json({ success: false, message: 'Debe especificar electionId.' });
        return;
      }

      const result = await this.electionService.undoLastBallot(electionId);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error al deshacer boleta:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/elections/ballot/reset
   * Reinicia el conteo de boletas
   */
  private async resetAllBallots(req: Request, res: Response): Promise<void> {
    try {
      let targetId = req.body.electionId;
      if (!targetId) {
        const activeElection = await this.electionService.getActiveElection();
        targetId = activeElection?.id;
      }
      if (!targetId) {
        res.status(400).json({ success: false, message: 'No hay ninguna elección activa para reiniciar.' });
        return;
      }

      const result = await this.electionService.resetAllBallots(targetId, req.body.performedBy);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error al reiniciar boletas:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/elections/candidate
   * Crea o actualiza un postulante
   */
  private async saveCandidate(req: Request, res: Response): Promise<void> {
    try {
      const { electionId, candidate } = req.body;
      if (!electionId || !candidate?.fullName) {
        res.status(400).json({
          success: false,
          message: 'Debe especificar electionId y candidate.fullName.',
        });
        return;
      }

      const result = await this.electionService.saveCandidate(electionId, candidate);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Error al guardar candidato:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * DELETE /api/elections/candidate/:id
   */
  private async removeCandidate(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const result = await this.electionService.removeCandidate(id);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Error al eliminar candidato:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/elections/settings
   */
  private async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const { electionId, settings } = req.body;
      if (!electionId || !settings) {
        res.status(400).json({ success: false, message: 'Debe especificar electionId y settings.' });
        return;
      }

      const result = await this.electionService.updateSettings(electionId, settings);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Error al actualizar configuración:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/elections/history
   * Retorna todas las votaciones registradas para el historial
   */
  private async getElectionHistory(_req: Request, res: Response): Promise<void> {
    try {
      const history = await this.electionService.getElectionHistory();
      res.status(200).json({ success: true, data: history });
    } catch (error: any) {
      logger.error('Error al obtener historial de elecciones:', error);
      res.status(500).json({ success: false, message: error.message || 'Error interno' });
    }
  }

  /**
   * GET /api/elections/:id
   * Obtiene los datos de una votación específica
   */
  private async getElectionById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const data = await this.electionService.getElectionById(id);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      logger.error('Error al obtener votación por ID:', error);
      res.status(404).json({ success: false, message: error.message || 'Votación no encontrada' });
    }
  }

  /**
   * POST /api/elections/close
   * Cierra y guarda oficialmente la votación con su fecha y notas
   */
  private async closeElection(req: Request, res: Response): Promise<void> {
    try {
      const { electionId, votingDate, notes, signers, performedBy } = req.body;
      if (!electionId) {
        res.status(400).json({ success: false, message: 'Debe especificar electionId.' });
        return;
      }

      const result = await this.electionService.closeElection(electionId, {
        votingDate,
        notes,
        signers,
        performedBy,
      });
      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error al cerrar la votación:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/elections/reopen
   * Reabre una votación cerrada
   */
  private async reopenElection(req: Request, res: Response): Promise<void> {
    try {
      const { electionId, performedBy } = req.body;
      if (!electionId) {
        res.status(400).json({ success: false, message: 'Debe especificar electionId.' });
        return;
      }

      const result = await this.electionService.reopenElection(electionId, performedBy);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error al reabrir la votación:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/elections/new
   * Inicia una nueva votación y la guarda en el historial
   */
  private async createNewElection(req: Request, res: Response): Promise<void> {
    try {
      const {
        title,
        period,
        votingDate,
        description,
        maxSelectionsPerBallot,
        quorumMinimum,
        copyCandidatesFromElectionId,
        closePrevious,
        performedBy,
      } = req.body;

      if (!title) {
        res.status(400).json({
          success: false,
          message: 'Debe especificar el título de la nueva votación.',
        });
        return;
      }

      const result = await this.electionService.createNewElection({
        title,
        period,
        votingDate,
        description,
        maxSelectionsPerBallot,
        quorumMinimum,
        copyCandidatesFromElectionId,
        closePrevious,
        performedBy,
      });

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Error al crear nueva votación:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
