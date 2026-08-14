import { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { SearchMemberForAccessUseCase } from '../../application/useCases/SearchMemberForAccessUseCase';
import { RegisterAccessLogUseCase } from '../../application/useCases/RegisterAccessLogUseCase';
import { GetRecentLogsUseCase } from '../../application/useCases/GetRecentLogsUseCase';
import { RegisterGuestUseCase } from '../../application/useCases/RegisterGuestUseCase';
import { RegisterStandalonePersonUseCase } from '../../application/useCases/RegisterStandalonePersonUseCase';
import { UpdateAccessLogUseCase } from '../../application/useCases/UpdateAccessLogUseCase';
import { authenticate, authorize } from '@modules/auth/infrastructure/middlewares/auth.middleware';

export class AccessController {
  public router = Router();
  private prisma = new PrismaClient();
  private searchUseCase = new SearchMemberForAccessUseCase(this.prisma);
  private registerLogUseCase = new RegisterAccessLogUseCase(this.prisma);
  private getLogsUseCase = new GetRecentLogsUseCase(this.prisma);
  private registerGuestUseCase = new RegisterGuestUseCase();
  private registerStandalonePersonUseCase = new RegisterStandalonePersonUseCase(this.prisma);
  private updateLogUseCase = new UpdateAccessLogUseCase(this.prisma);

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Only Admin, Staff, and SuperAdmin can use the gatehouse endpoints
    this.router.use(authenticate);
    this.router.use(authorize(['ADMIN', 'STAFF', 'SUPER_ADMIN']));

    this.router.get('/search', this.search.bind(this));
    this.router.post('/log', this.registerLog.bind(this));
    this.router.put('/log/:id', this.updateLog.bind(this));
    this.router.get('/logs/recent', this.getRecentLogs.bind(this));
    this.router.post('/guest', this.registerGuest.bind(this));
    this.router.post('/standalone-person', this.registerStandalonePerson.bind(this));
  }

  private async search(req: Request, res: Response) {
    try {
      const q = req.query.q as string;
      const type = (req.query.type as string) || 'SOCIO';
      const results = await this.searchUseCase.execute(q, type);
      res.status(200).json({ success: true, data: results });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error buscando socio' });
    }
  }

  private async registerLog(req: Request, res: Response) {
    try {
      const log = await this.registerLogUseCase.execute(req.body);
      res.status(201).json({ success: true, data: log });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error registrando acceso' });
    }
  }

  private async getRecentLogs(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const personId = req.query.personId ? (req.query.personId as string) : undefined;
      const startDate = req.query.startDate ? (req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? (req.query.endDate as string) : undefined;
      
      const logs = await this.getLogsUseCase.execute(limit, personId, startDate, endDate);
      res.status(200).json({ success: true, data: logs });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error obteniendo historial de accesos' });
    }
  }

  private async registerGuest(req: Request, res: Response) {
    try {
      const result = await this.registerGuestUseCase.execute(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message || 'Error registrando invitado' });
    }
  }

  private async updateLog(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const log = await this.updateLogUseCase.execute({ id, ...req.body });
      res.status(200).json({ success: true, data: log });
    } catch (error: any) {
      console.error(error);
      if (error.message.includes('expirado')) {
        res.status(403).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: 'Error actualizando el acceso' });
      }
    }
  }

  private async registerStandalonePerson(req: Request, res: Response) {
    try {
      const person = await this.registerStandalonePersonUseCase.execute(req.body);
      res.status(201).json({ success: true, data: person });
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ success: false, message: error.message || 'Error registrando persona' });
    }
  }
}
