import { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { GetMyProfileUseCase } from '../../application/useCases/GetMyProfileUseCase';
import { CreateMemberMassiveUseCase } from '../../application/useCases/CreateMemberMassiveUseCase';
import { GetMemberProfileByUserIdUseCase } from '../../application/useCases/GetMemberProfileByUserIdUseCase';
import { UpdateMemberUseCase } from '../../application/useCases/UpdateMemberUseCase';
import { authenticate, authorize } from '@modules/auth/infrastructure/middlewares/auth.middleware';

export class MemberController {
  public router = Router();
  private getMyProfileUseCase: GetMyProfileUseCase;
  private createMemberMassiveUseCase: CreateMemberMassiveUseCase;
  private getMemberProfileByUserIdUseCase: GetMemberProfileByUserIdUseCase;
  private updateMemberUseCase: UpdateMemberUseCase;

  constructor(prisma: PrismaClient) {
    this.getMyProfileUseCase = new GetMyProfileUseCase(prisma);
    this.createMemberMassiveUseCase = new CreateMemberMassiveUseCase(prisma);
    this.getMemberProfileByUserIdUseCase = new GetMemberProfileByUserIdUseCase(prisma);
    this.updateMemberUseCase = new UpdateMemberUseCase(prisma);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get('/me', authenticate, this.getMyProfile.bind(this));
    this.router.get('/user/:userId', authenticate, authorize(['SUPER_ADMIN', 'STAFF', 'ADMIN', 'MODULO_SOCIOS']), this.getMemberProfile.bind(this));
    this.router.put('/user/:userId', authenticate, authorize(['SUPER_ADMIN', 'STAFF', 'ADMIN', 'MODULO_SOCIOS']), this.updateMember.bind(this));
    this.router.post('/massive', authenticate, authorize(['SUPER_ADMIN', 'STAFF', 'ADMIN', 'MODULO_SOCIOS']), this.createMassive.bind(this));
  }

  private async getMyProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado' });
        return;
      }

      const profile = await this.getMyProfileUseCase.execute(userId);

      if (!profile) {
        res.status(404).json({ success: false, message: 'No se encontró un perfil de socio activo' });
        return;
      }

      res.json({ success: true, profile });
    } catch (error: any) {
      console.error('Error fetching member profile:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  private async getMemberProfile(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const profile = await this.getMemberProfileByUserIdUseCase.execute(userId);

      if (!profile) {
        res.status(404).json({ success: false, message: 'Perfil de socio no encontrado' });
        return;
      }
      res.json({ success: true, data: profile });
    } catch (error: any) {
      console.error('Error fetching member profile by id:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  private async updateMember(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const result = await this.updateMemberUseCase.execute(userId, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error updating member:', error);
      if (error.code === 'P2002') {
        res.status(400).json({ success: false, message: 'El correo, documento o número de membresía ya está en uso' });
        return;
      }
      res.status(500).json({ success: false, message: 'Error interno al actualizar socio' });
    }
  }

  private async createMassive(req: Request, res: Response) {
    try {
      const result = await this.createMemberMassiveUseCase.execute(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error in createMassive:', error);
      if (error.code === 'P2002') {
        res.status(400).json({ success: false, message: 'El correo, CI o número de membresía ya existe' });
        return;
      }
      res.status(500).json({ success: false, message: 'Error interno del servidor al crear socio' });
    }
  }
}
