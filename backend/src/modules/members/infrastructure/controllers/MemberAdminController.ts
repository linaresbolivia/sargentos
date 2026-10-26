import { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { MemberManagementService } from '../../application/services/memberManagement.service';
import { MembershipSalesAuditService } from '../../application/services/membershipSalesAudit.service';
import { CashierBillingService } from '../../application/services/cashierBilling.service';
import { AssemblyProtocolService } from '../../application/services/assemblyProtocol.service';
import { PredictiveAlertsService } from '../../application/services/predictiveAlerts.service';
import { FinancialReportsService } from '../../application/services/financialReports.service';
import { FinancialSettingsService } from '../../application/services/financialSettings.service';
import { AccountStatementSyncService } from '../../application/services/accountStatementSync.service';
import { PaymentQrService } from '../../application/services/paymentQr.service';
import { authenticate, authorize } from '@modules/auth/infrastructure/middlewares/auth.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const qrUploadDir = path.join(process.cwd(), 'uploads/payment-qr');
if (!fs.existsSync(qrUploadDir)) {
  fs.mkdirSync(qrUploadDir, { recursive: true });
}

const qrDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, qrUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `qr-${unique}${ext}`);
  }
});

const uploadQr = multer({
  storage: qrDiskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

export class MemberAdminController {
  public router = Router();

  private memberService: MemberManagementService;
  private salesService: MembershipSalesAuditService;
  private cashierService: CashierBillingService;
  private assemblyService: AssemblyProtocolService;
  private alertsService: PredictiveAlertsService;
  private reportsService: FinancialReportsService;
  private settingsService: FinancialSettingsService;
  private accountSyncService: AccountStatementSyncService;
  private paymentQrService: PaymentQrService;

  constructor(private prisma: PrismaClient) {
    this.memberService = new MemberManagementService(prisma);
    this.salesService = new MembershipSalesAuditService(prisma);
    this.cashierService = new CashierBillingService(prisma);
    this.assemblyService = new AssemblyProtocolService(prisma);
    this.alertsService = new PredictiveAlertsService(prisma);
    this.reportsService = new FinancialReportsService(prisma);
    this.settingsService = new FinancialSettingsService(prisma);
    this.accountSyncService = new AccountStatementSyncService(prisma);
    this.paymentQrService = new PaymentQrService(prisma);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    const adminRoles = authorize(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'MODULO_SOCIOS', 'MODULO_PQRS', 'MODULO_USUARIO_PQRS']);

    // 1. Directory & Member 360
    this.router.get('/admin/search', authenticate, adminRoles, this.searchMembers.bind(this));
    this.router.post('/admin/create', authenticate, adminRoles, this.createFullMember.bind(this));
    this.router.get('/admin/detail/:id', authenticate, adminRoles, this.getMemberDetail.bind(this));

    // 2. Sales & Audit (CDP)
    this.router.get('/admin/sales/plans', authenticate, adminRoles, this.listSalesPlans.bind(this));
    this.router.post('/admin/sales/plans', authenticate, adminRoles, this.createSalesPlan.bind(this));
    this.router.post('/admin/sales/plans/:id/audit', authenticate, adminRoles, this.auditPlan.bind(this));

    // 3. Cashier & Unified Billing
    this.router.get('/admin/cashier/debt/:personId', authenticate, adminRoles, this.getMemberDebtSheet.bind(this));
    this.router.post('/admin/cashier/pay', authenticate, adminRoles, this.processPayment.bind(this));
    this.router.get('/admin/cashier/closing', authenticate, adminRoles, this.getDailyCashClosing.bind(this));

    // 4. Assemblies Protocol
    this.router.get('/admin/assembly/session', authenticate, adminRoles, this.getAssemblySession.bind(this));
    this.router.post('/admin/assembly/freeze', authenticate, adminRoles, this.freezeCensus.bind(this));
    this.router.post('/admin/assembly/in-situ', authenticate, adminRoles, this.registerInSitu.bind(this));
    this.router.post('/admin/assembly/sign/:attendeeId', authenticate, adminRoles, this.signAttendance.bind(this));

    // 5. Predictive Alerts
    this.router.get('/admin/alerts/dependents', authenticate, adminRoles, this.getDependentAlerts.bind(this));
    this.router.get('/admin/alerts/honorary', authenticate, adminRoles, this.getHonoraryCandidates.bind(this));
    this.router.post('/admin/alerts/promote-honorary', authenticate, adminRoles, this.promoteToHonorary.bind(this));

    // 6. Reports
    this.router.get('/admin/reports/cartera-saneada', authenticate, adminRoles, this.getCarteraSaneada.bind(this));
    this.router.get('/admin/reports/revenue', authenticate, adminRoles, this.getRevenueSummary.bind(this));

    // 7. Settings
    this.router.get('/admin/settings', authenticate, adminRoles, this.getSettings.bind(this));
    this.router.put('/admin/settings/:key', authenticate, adminRoles, this.updateSetting.bind(this));

    // 8. Account Statements & Cartera Sync (Control de Acceso)
    this.router.get('/admin/account-statements/summary', authenticate, adminRoles, this.getAccountStatementsSummary.bind(this));
    this.router.get('/admin/account-statements/list', authenticate, adminRoles, this.listAccountStatements.bind(this));
    this.router.post('/admin/account-statements/sync-default', authenticate, adminRoles, this.syncDefaultAccountStatements.bind(this));
    this.router.post('/admin/account-statements/upload', authenticate, adminRoles, uploadMemory.single('file'), this.uploadAccountStatements.bind(this));

    // 9. Payment QR Configuration & Socio Vouchers Review
    this.router.get('/admin/payment-qr', authenticate, adminRoles, this.getPaymentQrConfig.bind(this));
    this.router.post('/admin/payment-qr', authenticate, adminRoles, uploadQr.single('qrImage'), this.updatePaymentQrConfig.bind(this));
    this.router.get('/admin/payment-vouchers', authenticate, adminRoles, this.listPaymentVouchers.bind(this));
    this.router.post('/admin/payment-vouchers/:id/review', authenticate, adminRoles, this.reviewPaymentVoucher.bind(this));
  }

  // --- Handlers ---

  private async searchMembers(req: Request, res: Response) {
    try {
      const { q, category, status } = req.query;
      const data = await this.memberService.searchMembers(
        q as string,
        category as string,
        status as string
      );
      res.json({ success: true, count: data.length, data });
    } catch (error: any) {
      console.error('Error searching members:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  private async createFullMember(req: Request, res: Response) {
    try {
      const result = await this.memberService.createFullMember(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error creating member:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async getMemberDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await this.memberService.getMemberDetail(id);
      if (!data) {
        res.status(404).json({ success: false, message: 'Socio no encontrado' });
        return;
      }
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  private async listSalesPlans(req: Request, res: Response) {
    try {
      const { status } = req.query;
      const data = await this.salesService.listPlans(status as string);
      res.json({ success: true, count: data.length, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  private async createSalesPlan(req: Request, res: Response) {
    try {
      const data = await this.salesService.createSalesPlan(req.body);
      res.status(201).json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async auditPlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await this.salesService.auditPlan(id, req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async getMemberDebtSheet(req: Request, res: Response) {
    try {
      const { personId } = req.params;
      const data = await this.cashierService.getMemberDebtSheet(personId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  private async processPayment(req: Request, res: Response) {
    try {
      const data = await this.cashierService.processPayment(req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async getDailyCashClosing(req: Request, res: Response) {
    try {
      const { date, cashier } = req.query;
      const data = await this.cashierService.getDailyCashClosing(date as string, cashier as string);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  private async getAssemblySession(req: Request, res: Response) {
    try {
      const { title, date } = req.query;
      const data = await this.assemblyService.getOrCreateSession(
        (title as string) || 'Asamblea General Ordinaria de Socios',
        date as string
      );
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  private async freezeCensus(req: Request, res: Response) {
    try {
      const { sessionId } = req.body;
      const data = await this.assemblyService.freezeCensus(sessionId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async registerInSitu(req: Request, res: Response) {
    try {
      const { sessionId, personId, inSituReceiptNumber } = req.body;
      const data = await this.assemblyService.registerInSituPaymentAndQuorum(sessionId, {
        personId,
        inSituReceiptNumber
      });
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async signAttendance(req: Request, res: Response) {
    try {
      const { attendeeId } = req.params;
      const { signatureType } = req.body;
      const data = await this.assemblyService.signAttendance(attendeeId, signatureType);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async getDependentAlerts(req: Request, res: Response) {
    try {
      const data = await this.alertsService.scanDependentMajorityAlerts();
      res.json({ success: true, count: data.length, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  private async getHonoraryCandidates(req: Request, res: Response) {
    try {
      const data = await this.alertsService.scanHonoraryCandidates();
      res.json({ success: true, count: data.length, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  private async promoteToHonorary(req: Request, res: Response) {
    try {
      const { personId, bankDetails } = req.body;
      const data = await this.alertsService.promoteToHonorary(personId, bankDetails);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async getCarteraSaneada(req: Request, res: Response) {
    try {
      const { category, status, maxDate } = req.query;
      const data = await this.reportsService.getCarteraEspecialSaneada({
        categoryCode: category as string,
        statusFilter: status as string,
        maxDateStr: maxDate as string
      });
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  private async getRevenueSummary(req: Request, res: Response) {
    try {
      const { year } = req.query;
      const data = await this.reportsService.getMonthlyRevenueSummary(year ? parseInt(year as string) : undefined);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  private async getSettings(req: Request, res: Response) {
    try {
      const data = await this.settingsService.getParameters();
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  private async updateSetting(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const { value, numericValue } = req.body;
      const data = await this.settingsService.updateParameter(key, value, numericValue, req.user?.email || 'admin');
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // --- Account Statements & Cartera Handlers ---

  private async getAccountStatementsSummary(req: Request, res: Response) {
    try {
      const data = await this.accountSyncService.getSummaryMetrics();
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error getting account statements summary:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  private async listAccountStatements(req: Request, res: Response) {
    try {
      const { search, statusFilter, page, limit } = req.query;
      const result = await this.accountSyncService.listAccountStatements({
        search: search as string,
        statusFilter: statusFilter as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20
      });
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('Error listing account statements:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  private async syncDefaultAccountStatements(req: Request, res: Response) {
    try {
      const result = await this.accountSyncService.syncFromDefaultDesktopFile();
      res.json({ success: true, message: 'Cartera Especial sincronizada correctamente', data: result });
    } catch (error: any) {
      console.error('Error syncing default cartera PDF:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  private async uploadAccountStatements(req: Request, res: Response) {
    try {
      if (!req.file || !req.file.buffer) {
        res.status(400).json({ success: false, message: 'No se recibió ningún archivo PDF' });
        return;
      }
      const cutOffDate = (req.body.cutOffDate as string) || '15/10/2026';
      const result = await this.accountSyncService.syncFromBuffer(req.file.buffer, cutOffDate);
      res.json({ success: true, message: 'Archivo PDF procesado y cartera actualizada correctamente', data: result });
    } catch (error: any) {
      console.error('Error processing uploaded cartera PDF:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // --- Payment QR & Voucher Handlers ---

  private async getPaymentQrConfig(req: Request, res: Response) {
    try {
      const data = await this.paymentQrService.getActiveQrConfig();
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Error fetching admin QR config:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  private async updatePaymentQrConfig(req: Request, res: Response) {
    try {
      const { bankName, accountNumber, accountType, accountHolder, nit, instructions } = req.body;
      const data = await this.paymentQrService.updateQrConfig(
        { bankName, accountNumber, accountType, accountHolder, nit, instructions },
        req.file,
        req.user?.email || 'admin'
      );
      res.json({ success: true, message: 'Configuración y QR de pago actualizados exitosamente', data });
    } catch (error: any) {
      console.error('Error updating admin QR config:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  private async listPaymentVouchers(req: Request, res: Response) {
    try {
      const { status, search, page, limit } = req.query;
      const data = await this.paymentQrService.listVouchersForAdmin({
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20
      });
      res.json({ success: true, ...data });
    } catch (error: any) {
      console.error('Error listing payment vouchers:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  private async reviewPaymentVoucher(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { action, reviewNotes } = req.body;
      if (!action || !['APROBADO', 'RECHAZADO'].includes(action)) {
        res.status(400).json({ success: false, message: 'Acción inválida. Debe ser APROBADO o RECHAZADO' });
        return;
      }
      const data = await this.paymentQrService.reviewVoucher(
        id,
        action,
        reviewNotes,
        req.user?.email || 'admin'
      );
      res.json({ success: true, message: `Comprobante ${action.toLowerCase()} exitosamente`, data });
    } catch (error: any) {
      console.error('Error reviewing payment voucher:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
}


