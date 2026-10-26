import { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { GetMyProfileUseCase } from '../../application/useCases/GetMyProfileUseCase';
import { CreateMemberMassiveUseCase } from '../../application/useCases/CreateMemberMassiveUseCase';
import { GetMemberProfileByUserIdUseCase } from '../../application/useCases/GetMemberProfileByUserIdUseCase';
import { UpdateMemberUseCase } from '../../application/useCases/UpdateMemberUseCase';
import { PaymentQrService } from '../../application/services/paymentQr.service';
import { authenticate, authorize } from '@modules/auth/infrastructure/middlewares/auth.middleware';

const voucherDir = path.join(process.cwd(), 'uploads/vouchers');
if (!fs.existsSync(voucherDir)) {
  fs.mkdirSync(voucherDir, { recursive: true });
}

const voucherStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, voucherDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `voucher-${unique}${ext}`);
  }
});

const uploadVoucher = multer({
  storage: voucherStorage,
  limits: { fileSize: 15 * 1024 * 1024 }
});

export class MemberController {
  public router = Router();
  private getMyProfileUseCase: GetMyProfileUseCase;
  private createMemberMassiveUseCase: CreateMemberMassiveUseCase;
  private getMemberProfileByUserIdUseCase: GetMemberProfileByUserIdUseCase;
  private updateMemberUseCase: UpdateMemberUseCase;
  private paymentQrService: PaymentQrService;

  constructor(prisma: PrismaClient) {
    this.getMyProfileUseCase = new GetMyProfileUseCase(prisma);
    this.createMemberMassiveUseCase = new CreateMemberMassiveUseCase(prisma);
    this.getMemberProfileByUserIdUseCase = new GetMemberProfileByUserIdUseCase(prisma);
    this.updateMemberUseCase = new UpdateMemberUseCase(prisma);
    this.paymentQrService = new PaymentQrService(prisma);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get('/me', authenticate, this.getMyProfile.bind(this));
    this.router.get('/me/account-statement', authenticate, this.getMyAccountStatement.bind(this));
    this.router.post('/me/payment-voucher', authenticate, uploadVoucher.single('voucher'), this.submitPaymentVoucher.bind(this));
    this.router.get('/payment-qr/config', this.getPaymentQrConfig.bind(this));

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

  private async getMyAccountStatement(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado' });
        return;
      }

      const statement = await this.paymentQrService.getMemberAccountStatement(userId);
      if (!statement) {
        res.status(404).json({ success: false, message: 'No se encontró registro de membresía o perfil de socio para esta cuenta.' });
        return;
      }

      res.json({ success: true, data: statement });
    } catch (error: any) {
      console.error('Error fetching member account statement:', error);
      res.status(500).json({ success: false, message: 'Error al consultar estado de cuenta del socio', error: error.message });
    }
  }

  private async submitPaymentVoucher(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, message: 'Debe adjuntar una imagen o documento del comprobante bancario' });
        return;
      }

      const { amount, referenceNumber, transferDate, notes, concept } = req.body;
      if (!amount || !referenceNumber) {
        res.status(400).json({ success: false, message: 'Monto y número de referencia bancaria son requeridos' });
        return;
      }

      const voucher = await this.paymentQrService.submitPaymentVoucher(
        userId,
        {
          amount: parseFloat(amount),
          referenceNumber,
          transferDate,
          notes,
          concept
        },
        req.file
      );

      res.status(201).json({
        success: true,
        message: 'Comprobante de pago enviado exitosamente. Será verificado por Recaudaciones.',
        data: voucher
      });
    } catch (error: any) {
      console.error('Error submitting payment voucher:', error);
      res.status(400).json({ success: false, message: error.message || 'Error al registrar comprobante de pago' });
    }
  }

  private async getPaymentQrConfig(req: Request, res: Response) {
    try {
      const config = await this.paymentQrService.getActiveQrConfig();
      res.json({ success: true, data: config });
    } catch (error: any) {
      console.error('Error fetching payment QR config:', error);
      res.status(500).json({ success: false, message: 'Error al obtener configuración de pago QR' });
    }
  }
}

