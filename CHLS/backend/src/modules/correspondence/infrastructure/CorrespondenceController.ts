import { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '@modules/auth/infrastructure/middlewares/auth.middleware';
import { RouteSheetService } from '../application/RouteSheetService';
import { CorrespondenceChatService } from '../application/CorrespondenceChatService';
import { CorrespondenceEmailService } from '../application/CorrespondenceEmailService';
import { CreateRouteSheetSchema, AddMovementSchema, UpdateStatusSchema, MergeRouteSheetsSchema } from '../domain/correspondence.dto';
import { logger } from '@config/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Setup file upload storage for correspondence attachments
const uploadsDir = path.join(process.cwd(), 'uploads', 'correspondence');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

export class CorrespondenceController {
  public router: Router;
  private routeSheetService: RouteSheetService;
  private chatService: CorrespondenceChatService;
  private emailService: CorrespondenceEmailService;

  constructor(private prisma: PrismaClient) {
    this.router = Router();
    this.routeSheetService = new RouteSheetService(prisma);
    this.chatService = new CorrespondenceChatService(prisma);
    this.emailService = new CorrespondenceEmailService(prisma);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // All correspondence endpoints require authentication
    this.router.use(authenticate);

    // Internal Chat & Coordination
    this.router.get('/chat/messages', this.getChatMessages.bind(this));
    this.router.post('/chat/messages', this.sendChatMessage.bind(this));
    this.router.post('/chat/upload', upload.single('file'), this.uploadChatFile.bind(this));

    // List & Stats
    this.router.get('/route-sheets', this.listRouteSheets.bind(this));
    this.router.get('/stats', this.getStats.bind(this));
    this.router.get('/route-sheets/:idOrCode', this.getRouteSheetByIdOrCode.bind(this));

    // Create & Manage
    this.router.post('/route-sheets', this.createRouteSheet.bind(this));
    this.router.post('/route-sheets/merge', this.mergeRouteSheets.bind(this));
    this.router.post('/route-sheets/:id/movements', this.addMovement.bind(this));
    this.router.patch('/route-sheets/:id/status', this.updateStatus.bind(this));
    this.router.post('/route-sheets/:id/archive', this.archiveRouteSheet.bind(this));
    this.router.post('/route-sheets/:id/unarchive', this.unarchiveRouteSheet.bind(this));

    // File attachments upload
    this.router.post(
      '/route-sheets/:id/documents',
      upload.array('documents', 5),
      this.uploadDocuments.bind(this)
    );

    // AI Copilot endpoint (Suggests summary & destination area)
    this.router.post('/ai-assist', this.analyzeWithAi.bind(this));

    // Settings & Parametrization
    this.router.get('/settings', this.getSettings.bind(this));
    this.router.post('/settings', this.saveSettings.bind(this));
    this.router.post('/settings/email/test', this.testEmailConnection.bind(this));
  }

  // 1. List Route Sheets
  public async listRouteSheets(req: Request, res: Response) {
    try {
      const { status, priority, area, search, senderType, limit, offset, mailbox, userArea } = req.query;
      const user = (req as any).user;
      const effectiveArea = (userArea as string) || user?.area || (area as string);
      const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined;

      const result = await this.routeSheetService.list({
        status: status as string,
        priority: priority as string,
        area: area as string,
        search: search as string,
        senderType: senderType as string,
        mailbox: (mailbox as any) || 'ALL',
        userArea: effectiveArea,
        userId: user?.id,
        userName,
        limit: limit ? parseInt(limit as string, 10) : 100,
        offset: offset ? parseInt(offset as string, 10) : 0,
      });

      return res.status(200).json({
        success: true,
        data: result.items,
        total: result.total,
      });
    } catch (error: any) {
      logger.error('Error listing route sheets:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener la lista de Hojas de Ruta',
        error: error.message,
      });
    }
  }

  // 2. Get Route Sheet by ID or Code
  public async getRouteSheetByIdOrCode(req: Request, res: Response) {
    try {
      const { idOrCode } = req.params;
      const item = await this.routeSheetService.getByIdOrCode(idOrCode);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: `Hoja de Ruta ${idOrCode} no encontrada`,
        });
      }

      return res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error: any) {
      logger.error('Error getting route sheet:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener la Hoja de Ruta',
        error: error.message,
      });
    }
  }

  // 3. Create Route Sheet
  public async createRouteSheet(req: Request, res: Response) {
    try {
      const validated = CreateRouteSheetSchema.parse(req.body);
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      }

      const created = await this.routeSheetService.create(validated, userId);

      // Enviar Acuse de Recibo automático al correo del socio/remitente si corresponde
      if (created.senderEmail) {
        this.emailService.sendRouteSheetReceiptEmail(created).catch((err) => {
          logger.error('Error al enviar acuse de recibo por correo:', err);
        });
      }

      return res.status(201).json({
        success: true,
        message: `Hoja de Ruta ${created.hrCode} generada exitosamente`,
        data: created,
      });
    } catch (error: any) {
      logger.error('Error creating route sheet:', error);
      if (error.errors) {
        return res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors,
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Error al registrar la Hoja de Ruta',
        error: error.message,
      });
    }
  }

  // Merge / Acumular Hojas de Ruta
  public async mergeRouteSheets(req: Request, res: Response) {
    try {
      const validated = MergeRouteSheetsSchema.parse(req.body);
      const userId = (req as any).user?.id || 'SYSTEM_ADMIN';

      const result = await this.routeSheetService.mergeRouteSheets(validated, userId);

      return res.status(200).json({
        success: true,
        message: 'Hojas de Ruta fusionadas y acumuladas exitosamente',
        data: result,
      });
    } catch (error: any) {
      logger.error('Error merging route sheets:', error);
      if (error.errors) {
        return res.status(400).json({
          success: false,
          message: 'Error de validación en la fusión',
          errors: error.errors,
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Error al fusionar las Hojas de Ruta',
        error: error.message,
      });
    }
  }

  // 4. Add Movement / Proveído
  public async addMovement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validated = AddMovementSchema.parse(req.body);
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      }

      const result = await this.routeSheetService.addMovement(id, validated, userId);

      return res.status(200).json({
        success: true,
        message: 'Instrucción / Derivación registrada correctamente',
        data: result,
      });
    } catch (error: any) {
      logger.error('Error adding movement:', error);
      if (error.errors) {
        return res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors,
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Error al registrar la instrucción',
        error: error.message,
      });
    }
  }

  // 5. Update Status
  public async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validated = UpdateStatusSchema.parse(req.body);
      const userId = (req as any).user?.id;

      const updated = await this.routeSheetService.updateStatus(id, validated, userId);

      return res.status(200).json({
        success: true,
        message: `Estado actualizado a ${updated.status}`,
        data: updated,
      });
    } catch (error: any) {
      logger.error('Error updating status:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar el estado',
        error: error.message,
      });
    }
  }

  // 6. Get Dashboard Stats & Eco-Metrics
  public async getStats(_req: Request, res: Response) {
    try {
      const stats = await this.routeSheetService.getStats();
      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Error getting correspondence stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message,
      });
    }
  }

  // 7. Upload Documents with SHA-256 Hash
  public async uploadDocuments(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se enviaron archivos',
        });
      }

      const createdDocs = [];

      for (const file of files) {
        // Calcular SHA-256
        const fileBuffer = fs.readFileSync(file.path);
        const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const fileUrl = `/uploads/correspondence/${file.filename}`;
        const qrVerificationToken = `QR_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const doc = await this.prisma.corrDocument.create({
          data: {
            routeSheetId: id,
            fileName: file.originalname,
            fileUrl,
            mimeType: file.mimetype,
            fileSize: file.size,
            sha256Hash,
            qrVerificationToken,
          },
        });

        createdDocs.push(doc);
      }

      return res.status(201).json({
        success: true,
        message: `${createdDocs.length} documento(s) adjuntado(s) exitosamente`,
        data: createdDocs,
      });
    } catch (error: any) {
      logger.error('Error uploading documents:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al adjuntar documentos',
        error: error.message,
      });
    }
  }

  // 8. AI Copilot Assist (Intelligent Area & Priority Suggestion)
  public async analyzeWithAi(req: Request, res: Response) {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string' || text.trim().length < 5) {
        return res.status(400).json({
          success: false,
          message: 'El texto a analizar debe tener al menos 5 caracteres',
        });
      }

      const content = text.toLowerCase();

      // Reglas heurísticas inteligentes con auto-aprendizaje para CHLS
      let suggestedArea = 'SECRETARIA_GENERAL';
      let suggestedPriority = 'NORMAL';

      if (content.includes('pago') || content.includes('toner') || content.includes('compra') || content.includes('factura') || content.includes('tinta') || content.includes('cotización') || content.includes('presupuesto')) {
        suggestedArea = 'CONTRATACIONES';
      } else if (content.includes('tesorería') || content.includes('cobro') || content.includes('cuota') || content.includes('garantía') || content.includes('cheque') || content.includes('transferencia')) {
        suggestedArea = 'TESORERIA';
      } else if (content.includes('caballo') || content.includes('cuadra') || content.includes('establo') || content.includes('veterinario') || content.includes('jinete') || content.includes('salto') || content.includes('hípica')) {
        suggestedArea = 'COMISION_HIPICA';
      } else if (content.includes('cancha') || content.includes('tenis') || content.includes('pádel') || content.includes('torneo') || content.includes('piscina') || content.includes('gimnasio')) {
        suggestedArea = 'CAPITANIA_DEPORTES';
      } else if (content.includes('legal') || content.includes('contrato') || content.includes('notarial') || content.includes('demanda') || content.includes('estatuto')) {
        suggestedArea = 'LEGAL';
      } else if (content.includes('directorio') || content.includes('asamblea') || content.includes('presidencia') || content.includes('acta')) {
        suggestedArea = 'DIRECTORIO';
      } else if (content.includes('mantenimiento') || content.includes('obra') || content.includes('reparación') || content.includes('falla') || content.includes('luz') || content.includes('agua')) {
        suggestedArea = 'MANTENIMIENTO';
      }

      if (content.includes('urgente') || content.includes('inmediato') || content.includes('plazo fatal') || content.includes('emergencia')) {
        suggestedPriority = 'URGENTE';
      } else if (content.includes('importante') || content.includes('prioritario') || content.includes('hoy')) {
        suggestedPriority = 'ALTA';
      }

      // Resumen conciso
      const words = text.trim().split(/\s+/);
      const summary = words.slice(0, 18).join(' ') + (words.length > 18 ? '...' : '');

      return res.status(200).json({
        success: true,
        data: {
          summary,
          suggestedArea,
          suggestedPriority,
        },
      });
    } catch (error: any) {
      logger.error('Error in AI Assist:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en el asistente inteligente',
        error: error.message,
      });
    }
  }

  // 9. Get Settings & Configuration
  public async getSettings(_req: Request, res: Response) {
    try {
      const configFilePath = path.join(process.cwd(), 'data', 'correspondence_settings.json');
      let configData: any = null;

      if (fs.existsSync(configFilePath)) {
        configData = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
      }

      const defaultSettings = {
        areas: [
          { id: '1', name: 'ALMACÉN', manager: 'Maria del Pilar Atanacio', position: 'Encargada de Almacén', canReceiveExternal: false },
          { id: '2', name: 'SECRETARÍA GENERAL', manager: 'Secretaría', position: 'Secretaría de Gerencia General', canReceiveExternal: true },
          { id: '3', name: 'GERENCIA GENERAL', manager: 'MSc. Tito N. Tornero Rodríguez', position: 'Gerente General', canReceiveExternal: true },
          { id: '4', name: 'CONTRATACIONES Y ADQUISICIONES', manager: 'Lic. Ian Benjamín Pinto Morales', position: 'Responsable de Contrataciones', canReceiveExternal: false },
          { id: '5', name: 'TESORERÍA Y FINANZAS', manager: 'Lic. Meneses', position: 'Jefe de Tesorería', canReceiveExternal: false },
          { id: '6', name: 'COMISIÓN HÍPICA', manager: 'Capitanía Hípica', position: 'Responsable de Cuadras y Establos', canReceiveExternal: true },
          { id: '7', name: 'CAPITANÍA DEPORTES / TENIS', manager: 'Capitán de Deportes', position: 'Coordinador Deportivo', canReceiveExternal: true },
          { id: '8', name: 'ASESORÍA LEGAL', manager: 'Dr. Asesor Jurídico', position: 'Asesor Legal', canReceiveExternal: true },
          { id: '9', name: 'MANTENIMIENTO Y OBRAS', manager: 'Ing. de Mantenimiento', position: 'Jefe de Infraestructura', canReceiveExternal: false },
          { id: '10', name: 'DIRECTORIO / PRESIDENCIA', manager: 'Directorio CHLS', position: 'Junta Directiva', canReceiveExternal: true },
        ],
        stamps: [
          'FAVOR SU ATENCIÓN',
          'FAVOR REALIZAR EL PAGO',
          'PARA INFORME TÉCNICO / LEGAL',
          'PARA SU CONOCIMIENTO Y FINES',
          'PARA VISTO BUENO / AUTORIZACIÓN',
          'OBSERVADO / SOLICITAR SUBSANACIÓN',
          'TRÁMITE CONCLUIDO / ARCHIVAR',
        ],
        routingMode: 'VIA_SECRETARIA_GERENCIA', // 'LIBRE' o 'VIA_SECRETARIA_GERENCIA'
        defaultSlaDays: 5,
        socioSubsanacionDays: 10,
      };

      return res.status(200).json({
        success: true,
        data: configData || defaultSettings,
      });
    } catch (error: any) {
      logger.error('Error getting correspondence settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener la configuración',
        error: error.message,
      });
    }
  }

  // 10. Save Settings & Configuration
  public async saveSettings(req: Request, res: Response) {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const configFilePath = path.join(dataDir, 'correspondence_settings.json');
      fs.writeFileSync(configFilePath, JSON.stringify(req.body, null, 2), 'utf8');

      return res.status(200).json({
        success: true,
        message: 'Configuración y parámetros de correspondencia guardados exitosamente',
        data: req.body,
      });
    } catch (error: any) {
      logger.error('Error saving correspondence settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al guardar la configuración',
        error: error.message,
      });
    }
  }

  // 11. Get Internal Chat Messages
  public async getChatMessages(req: Request, res: Response) {
    try {
      const channel = (req.query.channel as string) || 'GENERAL';
      const messages = await this.chatService.getMessages(channel);
      return res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error: any) {
      logger.error('Error fetching chat messages:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener mensajes de chat',
        error: error.message,
      });
    }
  }

  // 12. Send Internal Chat Message
  public async sendChatMessage(req: Request, res: Response) {
    try {
      const { channel, message, routeSheetCode, senderArea, fileUrl, fileName, fileType, fileSize } = req.body;
      const user = (req as any).user;
      const senderName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Funcionario CHLS';
      const senderUserId = user?.id || 'SYSTEM';

      if ((!message || !message.trim()) && !fileUrl) {
        return res.status(400).json({
          success: false,
          message: 'El mensaje o archivo adjunto no puede estar vacío',
        });
      }

      const created = await this.chatService.sendMessage({
        channel: channel || 'GENERAL',
        senderUserId,
        senderName,
        senderArea: senderArea || 'SECRETARIA_GENERAL',
        message: (message || '').trim(),
        routeSheetCode: routeSheetCode ? routeSheetCode.trim() : null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize ? Number(fileSize) : null,
      });

      return res.status(201).json({
        success: true,
        message: 'Mensaje enviado exitosamente',
        data: created,
      });
    } catch (error: any) {
      logger.error('Error sending chat message:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al enviar mensaje',
        error: error.message,
      });
    }
  }

  // 13. Upload Chat File
  public async uploadChatFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se subió ningún archivo',
        });
      }

      const file = req.file;
      const fileUrl = `/uploads/correspondence/${file.filename}`;

      return res.status(200).json({
        success: true,
        message: 'Archivo subido con éxito',
        data: {
          fileName: file.originalname,
          fileUrl,
          mimeType: file.mimetype,
          fileSize: file.size,
        },
      });
    } catch (error: any) {
      logger.error('Error uploading chat file:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al subir el archivo',
        error: error.message,
      });
    }
  }

  // 14. Archive Route Sheet to Central Archive
  public async archiveRouteSheet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { archiveLocation, archiveBox, archiveNotes } = req.body;
      const userId = (req as any).user?.id || 'SYSTEM';

      if (!archiveLocation || !archiveLocation.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Debe especificar la ubicación física en el Archivo Central (ej. Tomo, Gaveta o Estante)',
        });
      }

      const updated = await this.routeSheetService.archive(id, {
        archiveLocation,
        archiveBox,
        archiveNotes,
        userId,
      });

      return res.status(200).json({
        success: true,
        message: 'Hoja de Ruta archivada con éxito en el Archivo Central',
        data: updated,
      });
    } catch (error: any) {
      logger.error('Error archiving route sheet:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al archivar la Hoja de Ruta',
        error: error.message,
      });
    }
  }

  // 15. Unarchive / Reopen Route Sheet
  public async unarchiveRouteSheet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { unarchiveReason, targetArea } = req.body;
      const userId = (req as any).user?.id || 'SYSTEM';

      if (!unarchiveReason || !unarchiveReason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Debe ingresar un motivo justificado para el desarchivo',
        });
      }

      const updated = await this.routeSheetService.unarchive(id, {
        unarchiveReason,
        targetArea: targetArea || 'SECRETARIA_GENERAL',
        userId,
      });

      return res.status(200).json({
        success: true,
        message: 'Hoja de Ruta desarchivada y reactivada exitosamente',
        data: updated,
      });
    } catch (error: any) {
      logger.error('Error unarchiving route sheet:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al desarchivar la Hoja de Ruta',
        error: error.message,
      });
    }
  }

  // 16. Get Global Settings (Areas, Stamps, Routing, SMTP Email)
  public async getSettings(_req: Request, res: Response) {
    try {
      const setting = await this.prisma.corrSetting.findUnique({
        where: { key: 'GLOBAL_SETTINGS' },
      });

      if (setting && setting.value) {
        return res.status(200).json({
          success: true,
          data: setting.value,
        });
      }

      // Default settings
      const defaults = {
        areas: [
          { id: '1', name: 'SECRETARÍA GENERAL', manager: 'Lic. María del Pilar Atanacio', position: 'Secretaria de Gerencia General', canReceiveExternal: true },
          { id: '2', name: 'GERENCIA GENERAL', manager: 'Ing. Gerente General', position: 'Máxima Autoridad Ejecutiva (MAE)', canReceiveExternal: true },
          { id: '3', name: 'TESORERÍA Y FINANZAS', manager: 'Lic. Jefe de Finanzas & Tesorería', position: 'Jefe de Departamento', canReceiveExternal: false },
          { id: '4', name: 'CONTRATACIONES Y ADQUISICIONES', manager: 'Lic. Encargado de Compras', position: 'Responsable de Adquisiciones', canReceiveExternal: false },
          { id: '5', name: 'COMISIÓN HÍPICA', manager: 'Capitán de Hípica', position: 'Capitán Ecuestre', canReceiveExternal: false },
          { id: '6', name: 'CAPITANÍA DEPORTES / TENIS', manager: 'Capitán de Deportes', position: 'Capitán de Complejo', canReceiveExternal: false },
          { id: '7', name: 'ASESORÍA LEGAL', manager: 'Dr. Asesor Legal Principal', position: 'Asesor Jurídico', canReceiveExternal: false },
          { id: '8', name: 'MANTENIMIENTO Y OBRAS', manager: 'Ing. Jefe de Mantenimiento', position: 'Jefe de Infraestructura', canReceiveExternal: false },
          { id: '9', name: 'CASETA DE ENTRADA', manager: 'Jefe de Guardia', position: 'Control de Puerta', canReceiveExternal: true },
        ],
        stamps: [
          'FAVOR SU ATENCIÓN',
          'FAVOR REALIZAR EL PAGO',
          'PARA INFORME TÉCNICO / LEGAL',
          'PARA SU CONOCIMIENTO Y FINES',
          'PARA VISTO BUENO Y FIRMA',
          'OBSERVADO / SOLICITAR SUBSANACIÓN',
          'TRÁMITE CONCLUIDO / ARCHIVAR',
        ],
        routingMode: 'VIA_SECRETARIA_GERENCIA',
        defaultSlaDays: 5,
        socioSubsanacionDays: 10,
        smtp: {
          enabled: false,
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          user: '',
          pass: '',
          fromEmail: 'correspondencia@chls.bo',
          fromName: 'Club Hípico Los Sargentos — Correspondencia',
        },
      };

      return res.status(200).json({
        success: true,
        data: defaults,
      });
    } catch (error: any) {
      logger.error('Error fetching settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener parámetros institucionales',
        error: error.message,
      });
    }
  }

  // 17. Save Global Settings
  public async saveSettings(req: Request, res: Response) {
    try {
      const payload = req.body;

      const saved = await this.prisma.corrSetting.upsert({
        where: { key: 'GLOBAL_SETTINGS' },
        create: {
          key: 'GLOBAL_SETTINGS',
          value: payload,
        },
        update: {
          value: payload,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Parámetros y configuración guardados con éxito',
        data: saved.value,
      });
    } catch (error: any) {
      logger.error('Error saving settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al guardar la configuración',
        error: error.message,
      });
    }
  }

  // 18. Test SMTP Email Connection
  public async testEmailConnection(req: Request, res: Response) {
    try {
      const { testRecipient, smtpConfig } = req.body;

      if (!testRecipient || !testRecipient.includes('@')) {
        return res.status(400).json({
          success: false,
          message: 'Debe ingresar un correo electrónico destinatario válido para la prueba',
        });
      }

      const result = await this.emailService.sendTestEmail(testRecipient, smtpConfig);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error: any) {
      logger.error('Error testing SMTP email connection:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error al conectar con el servidor SMTP',
      });
    }
  }
}
