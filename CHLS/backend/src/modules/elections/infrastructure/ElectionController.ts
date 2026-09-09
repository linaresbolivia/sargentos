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

    // 2. Registro de boletas físicas sacadas del ánfora
    this.router.post('/ballot', this.registerBallot.bind(this));
    this.router.post('/ballot/undo', this.undoLastBallot.bind(this));
    this.router.post('/ballot/reset', this.resetAllBallots.bind(this));

    // 3. Parametrización de postulantes (hasta 15)
    this.router.post('/candidate', this.saveCandidate.bind(this));
    this.router.delete('/candidate/:id', this.removeCandidate.bind(this));

    // 4. Configuración general (límites de marcas, estados)
    this.router.post('/settings', this.updateSettings.bind(this));
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
      const { electionId, performedBy } = req.body;
      if (!electionId) {
        res.status(400).json({ success: false, message: 'Debe especificar electionId.' });
        return;
      }

      const result = await this.electionService.resetAllBallots(electionId, performedBy);
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
}
