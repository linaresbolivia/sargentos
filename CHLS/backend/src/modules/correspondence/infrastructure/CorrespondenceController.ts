import { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '@modules/auth/infrastructure/middlewares/auth.middleware';
import { RouteSheetService } from '../application/RouteSheetService';
import { CorrespondenceChatService } from '../application/CorrespondenceChatService';
import { CorrespondenceEmailService } from '../application/CorrespondenceEmailService';
import { DossierPdfService } from '../application/DossierPdfService';
import { OfficialCiteService } from '../application/OfficialCiteService';
import { CiteDocumentPdfService } from '../application/CiteDocumentPdfService';
import { CreateRouteSheetSchema, AddMovementSchema, UpdateStatusSchema, MergeRouteSheetsSchema } from '../domain/correspondence.dto';
import { logger } from '@config/logger';
import { socketService } from '@config/socket';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';

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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export class CorrespondenceController {
  public router: Router;
  private routeSheetService: RouteSheetService;
  private chatService: CorrespondenceChatService;
  private emailService: CorrespondenceEmailService;
  private dossierPdfService: DossierPdfService;
  private officialCiteService: OfficialCiteService;
  private citePdfService: CiteDocumentPdfService;

  constructor(private prisma: PrismaClient = new PrismaClient()) {
    this.router = Router();
    this.routeSheetService = new RouteSheetService(prisma);
    this.chatService = new CorrespondenceChatService(prisma);
    this.emailService = new CorrespondenceEmailService(prisma);
    this.dossierPdfService = new DossierPdfService(prisma);
    this.officialCiteService = new OfficialCiteService(prisma);
    this.citePdfService = new CiteDocumentPdfService();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // All correspondence endpoints require authentication
    this.router.use(authenticate);

    // Official CITEs Management & 5 Document Models (Instructivo JOFHR 022-2026)
    this.router.get('/cites/metadata', this.getCiteMetadata.bind(this));
    this.router.get('/cites/preview', this.getCitePreview.bind(this));
    this.router.get('/cites/stats', this.getCiteStats.bind(this));
    this.router.get('/cites', this.listOfficialCites.bind(this));
    this.router.post('/cites', this.createOfficialCite.bind(this));
    this.router.get('/cites/:idOrCode', this.getOfficialCiteById.bind(this));
    this.router.get('/cites/:idOrCode/pdf', this.getOfficialCitePdf.bind(this));
    this.router.patch('/cites/:id/status', this.updateOfficialCiteStatus.bind(this));
    this.router.post('/cites/:id/link-routesheet', this.linkCiteToRouteSheet.bind(this));

    // Internal Chat & Coordination
    this.router.get('/chat/contacts', this.getChatContacts.bind(this));
    this.router.get('/chat/presence', this.getChatPresence.bind(this));
    this.router.get('/chat/messages', this.getChatMessages.bind(this));
    this.router.post('/chat/messages', this.sendChatMessage.bind(this));
    this.router.put('/chat/read', this.markChatAsRead.bind(this));
    this.router.post('/chat/upload', upload.single('file'), this.uploadChatFile.bind(this));

    // List & Stats
    this.router.get('/route-sheets', this.listRouteSheets.bind(this));
    this.router.get('/stats', this.getStats.bind(this));
    this.router.get('/member-impact', this.getMemberEcoImpact.bind(this));
    this.router.get('/sla-summary', this.getSlaSummary.bind(this));
    this.router.get('/route-sheets/:idOrCode', this.getRouteSheetByIdOrCode.bind(this));

    // Create & Manage
    this.router.post('/route-sheets', this.createRouteSheet.bind(this));
    this.router.post('/route-sheets/merge', this.mergeRouteSheets.bind(this));
    this.router.post('/route-sheets/:id/movements', this.addMovement.bind(this));
    this.router.post('/route-sheets/:id/receive', this.receiveRouteSheet.bind(this));
    this.router.post('/route-sheets/:id/undo-derivation', this.undoDerivation.bind(this));
    this.router.post('/route-sheets/:id/movements/undo', this.undoDerivation.bind(this));
    this.router.post('/route-sheets/:id/notify-sla', this.notifySlaAlert.bind(this));
    this.router.patch('/route-sheets/:id/status', this.updateStatus.bind(this));
    this.router.post('/route-sheets/:id/archive', this.archiveRouteSheet.bind(this));
    this.router.post('/route-sheets/:id/unarchive', this.unarchiveRouteSheet.bind(this));

    // File attachments upload (accepts any field name: documents, files, etc.)
    this.router.post(
      '/route-sheets/:id/documents',
      upload.any(),
      this.uploadDocuments.bind(this)
    );

    // Unified Dossier PDF (Compiled chronological expediente with physical PDF attachments)
    this.router.get(
      '/route-sheets/:id/dossier-pdf',
      this.getDossierPdf.bind(this)
    );

    // Official Timeline 360° PDF (Executive chronological report with CHLS crest)
    this.router.get(
      '/route-sheets/:id/timeline-pdf',
      this.getTimelinePdf.bind(this)
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
      const { status, priority, area, search, senderType, limit, offset, mailbox, userArea, year } = req.query;
      const user = (req as any).user;
      const userId = user?.userId || user?.id;

      // Cargar datos completos del usuario desde la BD si no vienen completos en el token JWT
      let dbUser: any = null;
      if (userId) {
        dbUser = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, firstName: true, lastName: true, roles: { select: { name: true } } },
        });
      }

      const userName = dbUser
        ? `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim()
        : user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : undefined;
      const userEmail = (dbUser?.email || user?.email || '').toLowerCase().trim();

      // Resolver área efectiva y sus alias
      let effectiveArea = (userArea as string) || (area as string);
      const userAreaAliases: string[] = [];

      if (!effectiveArea) {
        // Resolver según email, nombre o roles
        const areaKey = await this.getUserAssignedAreaKey(dbUser || user);
        const areaConfig = OfficialCiteService.getAreaConfig(areaKey);
        if (areaConfig) {
          effectiveArea = areaConfig.name;
          userAreaAliases.push(areaConfig.name);
        }

        // Mapeos específicos de funcionarios clave
        if (userEmail.includes('mantenimiento') || userEmail.includes('cgonzales') || userName?.includes('Cristian Gonzales')) {
          effectiveArea = 'JEFE DE MANTENIMIENTO';
          userAreaAliases.push('JEFE DE MANTENIMIENTO', 'MANTENIMIENTO');
        } else if (userEmail.includes('contratacion') || userEmail.includes('compras')) {
          effectiveArea = 'RESPONSABLE DE CONTRATACIONES';
          userAreaAliases.push('RESPONSABLE DE CONTRATACIONES', 'CONTRATACIONES');
        } else if (userEmail.includes('secretaria')) {
          effectiveArea = 'SECRETARÍA';
          userAreaAliases.push('SECRETARÍA', 'SECRETARIA GENERAL');
        } else if (userEmail.includes('gerencia')) {
          effectiveArea = 'GERENCIA GENERAL';
          userAreaAliases.push('GERENCIA GENERAL');
        } else if (userEmail.includes('finanzas')) {
          effectiveArea = 'SUBGERENCIA DE OPERACIONES FINANCIERAS Y RECURSOS HUMANOS';
          userAreaAliases.push('SUBGERENCIA DE OPERACIONES FINANCIERAS Y RECURSOS HUMANOS', 'FINANZAS');
        }
      } else {
        userAreaAliases.push(effectiveArea);
        if (effectiveArea.includes('MANTEN')) {
          userAreaAliases.push('JEFE DE MANTENIMIENTO', 'MANTENIMIENTO');
        } else if (effectiveArea.includes('CONTRAT') || effectiveArea.includes('COMPRA')) {
          userAreaAliases.push('RESPONSABLE DE CONTRATACIONES', 'CONTRATACIONES');
        } else if (effectiveArea.includes('SECRETAR')) {
          userAreaAliases.push('SECRETARÍA', 'SECRETARIA GENERAL');
        } else if (effectiveArea.includes('FINAN') || effectiveArea.includes('OPERACIONES FINANCIERAS')) {
          userAreaAliases.push('SUBGERENCIA DE OPERACIONES FINANCIERAS Y RECURSOS HUMANOS', 'FINANZAS');
        }
      }

      let requestedMailbox = (mailbox as any);
      const has360 = await this.canAccessGlobal360(dbUser || user);

      // Seguridad Institucional CHLS:
      // Si no se especifica mailbox (carga general):
      // - Usuarios con acceso 360 reciben 'ALL' (supervisión global).
      // - Usuarios estándar reciben 'USER_SCOPE' (inbox, outbox, copias, archivo personal y archivo central para consulta).
      if (!requestedMailbox) {
        requestedMailbox = has360 ? 'ALL' : 'USER_SCOPE';
      } else if (requestedMailbox === 'ALL') {
        if (!has360) {
          requestedMailbox = 'USER_SCOPE';
        }
      }

      const result = await this.routeSheetService.list({
        status: status as string,
        priority: priority as string,
        area: area as string,
        search: search as string,
        senderType: senderType as string,
        year: year && year !== 'ALL' ? parseInt(year as string, 10) : undefined,
        mailbox: requestedMailbox,
        userArea: effectiveArea,
        userAreaAliases,
        userId,
        userName,
        limit: limit ? parseInt(limit as string, 10) : 500,
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
      const user = (req as any).user;
      const userId = user?.userId || user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      }

      // Restricción Institucional CHLS: Solo Gerencia General y Secretaría de Gerencia pueden radicar Hojas de Ruta
      const isAuthorized = await this.canCreateRouteSheet(user, req.body);
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado: Por normativa institucional, la radicación de Hojas de Ruta está reservada exclusivamente para Gerencia General y Secretaría de Gerencia.',
        });
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
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM_ADMIN';

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
      const user = (req as any).user;
      const userId = user?.userId || user?.id;

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

  // 4.b. Receive Movement / Route Sheet in Destination Area
  public async receiveRouteSheet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const userId = user?.id || user?.userId;

      const updated = await this.routeSheetService.receive(id, userId);

      return res.status(200).json({
        success: true,
        message: `Hoja de Ruta ${updated.hrCode} recepcionada exitosamente en el despacho`,
        data: updated,
      });
    } catch (error: any) {
      logger.error('Error receiving route sheet:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al recepcionar la hoja de ruta',
        error: error.message,
      });
    }
  }

  // 4.c. Undo Derivation / Cancel outgoing unreceived movement
  public async undoDerivation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const userId = user?.id || user?.userId;

      // Cargar datos completos del usuario desde la BD
      let dbUser: any = null;
      if (userId) {
        dbUser = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, firstName: true, lastName: true, roles: { select: { name: true } } },
        });
      }

      const has360 = await this.canAccessGlobal360(dbUser || user);
      let userArea = req.body?.userArea || (req.query?.userArea as string);
      if (!userArea) {
        const areaKey = await this.getUserAssignedAreaKey(dbUser || user);
        const areaConfig = OfficialCiteService.getAreaConfig(areaKey);
        userArea = areaConfig?.name || 'GERENCIA GENERAL';
      }

      const userEmail = dbUser?.email || user?.email;
      const result = await this.routeSheetService.undoDerivation(id, userId, userArea, has360, userEmail);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.routeSheet,
      });
    } catch (error: any) {
      logger.error('Error undoing route sheet derivation:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error al deshacer la derivación',
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

  // 6.b. Get Member Eco Impact (Iniciativa Cero Papel - CLUB INTELIGENTE)
  public async getMemberEcoImpact(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { personId, senderName, documentId } = req.query;

      const result = await this.routeSheetService.getMemberEcoImpact({
        personId: (personId as string) || user?.person?.id,
        senderName: (senderName as string) || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined),
        documentId: (documentId as string) || user?.documentId,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error getting member eco impact:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener impacto ecológico del socio',
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

      // Validación estricta: Solo en derivaciones los adjuntos deben ser PDF
      const isDerivation = req.query.isDerivation === 'true' || req.body?.isDerivation === 'true';
      if (isDerivation) {
        const nonPdf = files.find(
          (f) => f.mimetype !== 'application/pdf' && !f.originalname.toLowerCase().endsWith('.pdf')
        );
        if (nonPdf) {
          for (const file of files) {
            try {
              if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            } catch {}
          }
          return res.status(400).json({
            success: false,
            message: 'En las derivaciones únicamente se permiten documentos en formato PDF (.pdf).',
          });
        }
      }

      const createdDocs = [];
      const movementId = (req.body?.movementId || req.query?.movementId) as string | undefined;

      // 1. Filtrar duplicados en el lote actual (mismo nombre y tamaño)
      const uniqueFiles: Express.Multer.File[] = [];
      const seenBatchKeys = new Set<string>();

      for (const file of files) {
        const batchKey = `${file.originalname}_${file.size}`;
        if (seenBatchKeys.has(batchKey)) {
          try {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          } catch {}
          continue;
        }
        seenBatchKeys.add(batchKey);
        uniqueFiles.push(file);
      }

      let totalDetectedPages = 0;

      for (const file of uniqueFiles) {
        // Calcular SHA-256
        const fileBuffer = fs.readFileSync(file.path);
        const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // Contar páginas si es archivo PDF
        let docPages = 1;
        if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
          try {
            const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
            docPages = Math.max(1, pdfDoc.getPageCount());
          } catch (pdfErr) {
            logger.warn('Failed to parse PDF page count in uploadDocuments:', pdfErr);
          }
        }
        totalDetectedPages += docPages;

        // 2. Prevenir duplicados si el documento idéntico ya está registrado
        const existingDoc = await this.prisma.corrDocument.findFirst({
          where: {
            routeSheetId: id,
            fileName: file.originalname,
            sha256Hash: sha256Hash,
            movementId: movementId || null,
          },
        });

        if (existingDoc) {
          try {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          } catch {}
          createdDocs.push(existingDoc);
          continue;
        }

        const fileUrl = `/uploads/correspondence/${file.filename}`;
        const qrVerificationToken = `QR_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const doc = await this.prisma.corrDocument.create({
          data: {
            routeSheetId: id,
            movementId: movementId || null,
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

      // Si se adjuntaron documentos a una derivación o movimiento, actualizar fojas acumuladas
      const rawAttachedPages = req.body?.attachedPages || req.query?.attachedPages;
      const pagesToAdd = rawAttachedPages ? parseInt(String(rawAttachedPages), 10) : totalDetectedPages;

      if (pagesToAdd > 0 && (movementId || req.body?.isDerivation === 'true' || req.query?.isDerivation === 'true')) {
        await this.prisma.routeSheet.update({
          where: { id },
          data: {
            pageCount: {
              increment: pagesToAdd,
            },
          },
        });
        logger.info(`Hoja de Ruta ${id} incrementada en ${pagesToAdd} fojas por derivación con adjuntos.`);
      }

      return res.status(201).json({
        success: true,
        message: `${createdDocs.length} documento(s) adjuntado(s) exitosamente (${pagesToAdd} fojas registradas)`,
        data: createdDocs,
        pagesAdded: pagesToAdd,
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

  // 11. Get Internal Chat Contacts / Users Directory
  public async getChatContacts(req: Request, res: Response) {
    try {
      const users = await this.prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          roles: {
            select: { name: true },
          },
        },
        orderBy: { firstName: 'asc' },
      });

      const currentUserEmail = (req as any).user?.email || '';
      const currentUsername = currentUserEmail.split('@')[0].toLowerCase();

      // Find all DM messages involving this user to calculate recent conversation sorting
      const allDmMessages = await this.prisma.corrChatMessage.findMany({
        where: {
          channel: {
            startsWith: 'dm_',
            contains: currentUsername,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Map other user -> latest message
      const latestMsgByContact = new Map<string, { message: string; createdAt: Date; senderUserId: string }>();
      for (const msg of allDmMessages) {
        const parts = msg.channel.split('_').slice(1);
        const otherUser = parts.find((p) => p !== currentUsername) || parts[0];
        if (otherUser && !latestMsgByContact.has(otherUser)) {
          latestMsgByContact.set(otherUser, {
            message: msg.message || (msg.fileName ? `📎 ${msg.fileName}` : 'Archivo adjunto'),
            createdAt: msg.createdAt,
            senderUserId: msg.senderUserId,
          });
        }
      }

      const contacts = users.map((u) => {
        const username = u.email.split('@')[0].toLowerCase();
        const role = u.roles[0]?.name || 'STAFF';
        const lastMsg = latestMsgByContact.get(username);
        return {
          id: u.id,
          username,
          email: u.email,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || username,
          role,
          phone: u.phone,
          lastMessage: lastMsg ? lastMsg.message : null,
          lastMessageAt: lastMsg ? lastMsg.createdAt.toISOString() : null,
        };
      });

      // Sort contacts: Most recent message first, then alphabetical!
      contacts.sort((a, b) => {
        if (a.lastMessageAt && b.lastMessageAt) {
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        }
        if (a.lastMessageAt) return -1;
        if (b.lastMessageAt) return 1;
        return a.name.localeCompare(b.name);
      });

      return res.status(200).json({
        success: true,
        data: contacts,
      });
    } catch (error: any) {
      logger.error('Error fetching chat contacts:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener contactos para chat',
        error: error.message,
      });
    }
  }

  // 12. Get Real-time User Presence Map
  public async getChatPresence(req: Request, res: Response) {
    try {
      const presence = socketService.getAllPresence();
      return res.status(200).json({
        success: true,
        data: presence,
      });
    } catch (error: any) {
      logger.error('Error fetching chat presence:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estado de presencia',
        error: error.message,
      });
    }
  }

  // 13. Get Internal Chat Messages
  public async getChatMessages(req: Request, res: Response) {
    try {
      const channel = (req.query.channel as string) || 'GENERAL';
      const user = (req as any).user;
      const readerIdentifier = user?.username || user?.email || user?.id || '';
      const messages = await this.chatService.getMessages(channel, 80, readerIdentifier);
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

  // 14. Mark Chat Messages as Read
  public async markChatAsRead(req: Request, res: Response) {
    try {
      const { channel } = req.body;
      const user = (req as any).user;
      const readerIdentifier = user?.username || user?.email || user?.id || '';
      const result = await this.chatService.markAsRead(channel, readerIdentifier);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error marking chat as read:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al marcar mensajes como leídos',
        error: error.message,
      });
    }
  }

  // 12. Send Internal Chat Message
  public async sendChatMessage(req: Request, res: Response) {
    try {
      const {
        channel,
        message,
        routeSheetCode,
        senderArea,
        fileUrl,
        fileName,
        fileType,
        fileSize,
        replyToId,
        replyToSenderName,
        replyToText,
      } = req.body;
      const user = (req as any).user;
      const username = user?.username || user?.email?.split('@')[0] || 'usuario';
      const userEmail = user?.email || '';
      const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
      const senderName = fullName || username || userEmail || 'Funcionario CHLS';
      const senderUserId = user?.id || username || userEmail || 'SYSTEM';
      const effectiveArea = senderArea || user?.area || user?.department || 'CHLS';

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
        senderArea: effectiveArea,
        message: (message || '').trim(),
        routeSheetCode: routeSheetCode ? routeSheetCode.trim() : null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize ? Number(fileSize) : null,
        replyToId: replyToId || null,
        replyToSenderName: replyToSenderName || null,
        replyToText: replyToText || null,
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

  // 14. Archive Route Sheet to Personal or Central Archive
  public async archiveRouteSheet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { archiveLocation, archiveBox, archiveNotes, archiveType } = req.body;
      const user = (req as any).user;
      const userId = user?.userId || user?.id || req.body.userId;

      if (!archiveLocation || !archiveLocation.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Debe especificar la ubicación física del archivo (ej. Estante, Caja o Carpeta)',
        });
      }

      const updated = await this.routeSheetService.archive(id, {
        archiveLocation,
        archiveBox,
        archiveNotes,
        userId,
        archiveType: archiveType as 'PERSONAL' | 'CENTRAL',
      });

      const isPersonal = archiveType === 'PERSONAL' || archiveLocation.toUpperCase().includes('PERSONAL');
      return res.status(200).json({
        success: true,
        message: isPersonal
          ? 'Hoja de Ruta guardada exitosamente en su Archivo Personal'
          : 'Hoja de Ruta archivada con éxito en el Archivo Central',
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
      const user = (req as any).user;
      const userId = user?.userId || user?.id || req.body.userId;

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

  // 16. Get Global Settings (Areas, Stamps, Routing, SMTP Email, Gestiones)
  public async getSettings(_req: Request, res: Response) {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const configFilePath = path.join(dataDir, 'correspondence_settings.json');
      let configData: any = null;

      if (fs.existsSync(configFilePath)) {
        try {
          configData = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
        } catch (err) {
          logger.warn('Could not parse correspondence_settings.json, recreating defaults');
        }
      }

      if (!configData) {
        configData = {
          areas: [
            { id: '1', name: 'SECRETARÍA GENERAL', manager: 'María del Pilar Atanacio', position: 'Secretaria de Gerencia General', canReceiveExternal: true },
            { id: '2', name: 'GERENCIA GENERAL', manager: 'Gerente General', position: 'Máxima Autoridad Ejecutiva (MAE)', canReceiveExternal: true },
            { id: '3', name: 'TESORERÍA Y FINANZAS', manager: 'Jefe de Finanzas & Tesorería', position: 'Jefe de Departamento', canReceiveExternal: false },
            { id: '4', name: 'CONTRATACIONES Y ADQUISICIONES', manager: 'Encargado de Compras', position: 'Responsable de Adquisiciones', canReceiveExternal: false },
            { id: '5', name: 'COMISIÓN HÍPICA', manager: 'Capitán de Hípica', position: 'Capitán Ecuestre', canReceiveExternal: false },
            { id: '6', name: 'CAPITANÍA DEPORTES / TENIS', manager: 'Capitán de Deportes', position: 'Capitán de Complejo', canReceiveExternal: false },
            { id: '7', name: 'ASESORÍA LEGAL', manager: 'Asesor Legal Principal', position: 'Asesor Jurídico', canReceiveExternal: false },
            { id: '8', name: 'MANTENIMIENTO Y OBRAS', manager: 'Jefe de Mantenimiento', position: 'Jefe de Infraestructura', canReceiveExternal: false },
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
          currentGestion: 2026,
          initialCorrelativeNumber: 1,
          prefixFormat: 'HR-{YYYY}-{CORR}',
          gestiones: {
            '2026': { initialCorrelative: 1, label: 'Gestión 2026' }
          },
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
        fs.writeFileSync(configFilePath, JSON.stringify(configData, null, 2), 'utf8');
      }

      return res.status(200).json({
        success: true,
        data: configData,
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
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const configFilePath = path.join(dataDir, 'correspondence_settings.json');
      fs.writeFileSync(configFilePath, JSON.stringify(payload, null, 2), 'utf8');

      // Si se actualizó el organigrama y flujos, emitir evento en tiempo real a todos los clientes conectados
      if (payload.workflow) {
        try {
          socketService.getIo()?.emit('correspondence:workflow:updated', payload.workflow);
          logger.info('[CorrespondenceController] Organigrama y flujos emitidos vía WebSocket a clientes');
        } catch (sockErr) {
          logger.warn('[CorrespondenceController] Error al emitir workflow por socket:', sockErr);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Parámetros y configuración guardados con éxito',
        data: payload,
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

  // 19. Get SLA Performance Summary
  public async getSlaSummary(req: Request, res: Response) {
    try {
      const summary = await this.routeSheetService.getSlaSummary();
      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      logger.error('Error retrieving SLA performance summary:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error al calcular resumen SLA',
      });
    }
  }

  // 20. Send Immediate SLA Urgency Alert
  public async notifySlaAlert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { channel, note, customPhone, customEmail } = req.body;
      const user = (req as any).user;

      const senderUser = {
        id: user?.id || 'system',
        name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Control de Gestión',
      };

      const result = await this.routeSheetService.notifySlaAlert(
        id,
        {
          channel: channel || 'BOTH',
          note: note || undefined,
          customPhone: customPhone || undefined,
          customEmail: customEmail || undefined,
        },
        senderUser
      );

      return res.status(200).json({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (error: any) {
      logger.error('Error sending SLA alert:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error al enviar alerta SLA',
      });
    }
  }

  // 8. Get Unified Dossier PDF (Compiled chronological expediente with all attached PDFs merged)
  public async getDossierPdf(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pdfBuffer = await this.dossierPdfService.generateUnifiedDossierPdf(id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Expediente_${id}_Completo.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer);
    } catch (error: any) {
      logger.error('Error generating unified dossier PDF:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al compilar el Expediente Completo Unificado en PDF',
        error: error.message,
      });
    }
  }

  // 9. Get Official Timeline 360° PDF (Executive chronological report with CHLS crest)
  public async getTimelinePdf(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pdfBuffer = await this.dossierPdfService.generateTimelinePdf(id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Trazabilidad_${id}_360.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer);
    } catch (error: any) {
      logger.error('Error generating timeline PDF:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al generar el Reporte de Trazabilidad 360° en PDF',
        error: error.message,
      });
    }
  }

  /**
   * Valida si el usuario actual tiene autorización para la "Vista Global 360°"
   * Permitido exclusivamente para:
   * 1. Gerente General
   * 2. Tecnología (Encargado de Sistemas, TI, SuperAdmin, Admin)
   * 3. Secretaría de Gerencia
   */
  private async canAccessGlobal360(user: any): Promise<boolean> {
    if (!user) return false;
    const roles: string[] = (user.roles || []).map((r: any) =>
      (typeof r === 'string' ? r : r.name || '').toUpperCase()
    );

    // SuperAdmin y Administradores de Tecnología
    if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
      return true;
    }

    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.userId || user.id },
        select: { email: true, firstName: true, lastName: true, roles: { select: { name: true } } },
      });

      const userRoles = dbUser?.roles?.map((r) => r.name.toUpperCase()) || roles;
      if (userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN')) {
        return true;
      }

      const normalize = (s: string) => (s || '').toUpperCase().trim();
      const uEmail = (dbUser?.email || user.email || '').toLowerCase().trim();
      const uFull = normalize(`${dbUser?.firstName || user.firstName || ''} ${dbUser?.lastName || user.lastName || ''}`);

      // 1. Gerencia General
      if (
        userRoles.includes('GERENTE_GENERAL') ||
        userRoles.includes('MODULO_DIRECTORIO') ||
        uEmail.startsWith('gerencia') ||
        uEmail.includes('gerente') ||
        uFull.includes('GERENTE GENERAL') ||
        uFull.includes('GERENCIA')
      ) {
        return true;
      }

      // 2. Tecnología / Sistemas
      if (
        userRoles.includes('SISTEMAS') ||
        userRoles.includes('TECNOLOGIA') ||
        uEmail.startsWith('sistemas') ||
        uEmail.startsWith('admin') ||
        uEmail.includes('tecnologia') ||
        (uEmail.includes('@chls.bo') && uEmail.startsWith('ti')) ||
        uFull.includes('SISTEMAS') ||
        uFull.includes('TECNOLOGIA')
      ) {
        return true;
      }

      // 3. Secretaría de Gerencia
      if (
        userRoles.includes('SECRETARIA') ||
        uEmail.startsWith('secretaria') ||
        uFull.includes('SECRETARIA')
      ) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Valida si el usuario actual tiene autorización para radicar/crear Hojas de Ruta.
   * Por directriz institucional CHLS, solo pueden crear Hojas de Ruta:
   * 1. Gerencia General
   * 2. Secretaría de Gerencia
   * 3. Super Administradores y TI (soporte técnico institucional)
   * 4. Portería/Caseta únicamente cuando se trate de recepción de facturas de servicios básicos.
   */
  private async canCreateRouteSheet(user: any, body?: any): Promise<boolean> {
    if (!user) return false;
    const roles: string[] = (user.roles || []).map((r: any) =>
      (typeof r === 'string' ? r : r.name || '').toUpperCase()
    );

    // SuperAdmin maestro
    if (roles.includes('SUPER_ADMIN')) {
      return true;
    }

    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.userId || user.id },
        select: { email: true, firstName: true, lastName: true, roles: { select: { name: true } } },
      });

      const userRoles = dbUser?.roles?.map((r) => r.name.toUpperCase()) || roles;
      if (userRoles.includes('SUPER_ADMIN')) {
        return true;
      }

      const normalize = (s: string) => (s || '').toUpperCase().trim();
      const uEmail = (dbUser?.email || user.email || '').toLowerCase().trim();
      const uFull = normalize(`${dbUser?.firstName || user.firstName || ''} ${dbUser?.lastName || user.lastName || ''}`);

      // 1. Gerencia General
      if (
        userRoles.includes('GERENTE_GENERAL') ||
        userRoles.includes('MODULO_DIRECTORIO') ||
        uEmail.startsWith('gerencia') ||
        uEmail.includes('gerente') ||
        uFull.includes('GERENTE GENERAL') ||
        uFull.includes('GERENCIA')
      ) {
        return true;
      }

      // 2. Secretaría de Gerencia
      if (
        userRoles.includes('SECRETARIA') ||
        uEmail.startsWith('secretaria') ||
        uFull.includes('SECRETARIA')
      ) {
        return true;
      }

      // 3. Soporte Sistemas / TI
      if (
        userRoles.includes('SISTEMAS') ||
        userRoles.includes('TECNOLOGIA') ||
        uEmail.startsWith('sistemas') ||
        uEmail.startsWith('admin@') ||
        uEmail.startsWith('tecnologia') ||
        (uEmail.includes('@sargentos') && uEmail.startsWith('admin'))
      ) {
        return true;
      }

      // 4. Recepción de facturas de servicios básicos desde caseta / portería
      if (
        (userRoles.includes('MODULO_PORTERIA') || uEmail.startsWith('caseta') || uEmail.startsWith('porteria')) &&
        (body?.reference?.toUpperCase().includes('FACTURA') || body?.senderType === 'EXTERNO')
      ) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Resuelve el área oficial asignada al usuario autenticado
   */
  private async getUserAssignedAreaKey(user: any): Promise<string> {
    if (!user) return 'GG';
    const userId = user.userId || user.id;

    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true, roles: { select: { name: true } } },
      });

      const email = (dbUser?.email || user.email || '').toLowerCase().trim();
      const fullName = `${dbUser?.firstName || user.firstName || ''} ${dbUser?.lastName || user.lastName || ''}`;
      const roles = (dbUser?.roles || []).map((r) => r.name.toUpperCase());

      // 1. Correo electrónico institucional
      const emailPrefix = email.split('@')[0];
      const fromEmail = OfficialCiteService.resolveAreaKey(emailPrefix);
      if (fromEmail !== 'GG' || emailPrefix.includes('geren') || emailPrefix.includes('secre')) {
        return fromEmail;
      }

      // 2. Nombre completo / cargo del usuario
      const fromName = OfficialCiteService.resolveAreaKey(fullName);
      if (fromName !== 'GG') return fromName;

      // 3. Roles del usuario
      for (const r of roles) {
        const fromRole = OfficialCiteService.resolveAreaKey(r);
        if (fromRole !== 'GG') return fromRole;
      }

      if (user.area) {
        return OfficialCiteService.resolveAreaKey(user.area);
      }

      return 'GG';
    } catch {
      return 'GG';
    }
  }

  // =========================================================================
  // OFFICIAL CITES CONTROLLER METHODS (INSTRUCTIVO JOFHR 022-2026)
  // =========================================================================

  public async getCiteMetadata(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      const canAccessAll = await this.canAccessGlobal360(user);
      const userAreaKey = await this.getUserAssignedAreaKey(user);
      const userAreaConfig = OfficialCiteService.getAreaConfig(userAreaKey);

      const metadata = this.officialCiteService.getMetadata();
      return res.json({
        success: true,
        data: {
          ...metadata,
          userAreaKey,
          userAreaName: userAreaConfig?.name || userAreaKey,
          canAccessAllAreas: canAccessAll,
          allowedDocTypesForUser: canAccessAll
            ? ['INF', 'CI', 'INST', 'MEM', 'NE']
            : userAreaConfig?.allowedTypes || ['INF', 'CI'],
        },
      });
    } catch (error: any) {
      logger.error('Error fetching CITE metadata:', error);
      return res.status(500).json({ error: error.message || 'Error al obtener catálogo de CITEs' });
    }
  }

  public async getCitePreview(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      const { areaKey, docType, year } = req.query;
      if (!docType) {
        return res.status(400).json({ error: 'docType es obligatorio' });
      }

      const canAccessAll = await this.canAccessGlobal360(user);
      const userAreaKey = await this.getUserAssignedAreaKey(user);

      // Si no tiene permiso 360, se fuerza su área asignada
      const effectiveAreaKey = canAccessAll ? (areaKey ? String(areaKey) : userAreaKey) : userAreaKey;

      const y = year ? Number(year) : new Date().getFullYear();
      const preview = await this.officialCiteService.getNextCitePreview(
        effectiveAreaKey,
        String(docType),
        y
      );

      return res.json({ success: true, data: { ...preview, areaKey: effectiveAreaKey } });
    } catch (error: any) {
      logger.error('Error getting CITE preview:', error);
      return res.status(500).json({ error: error.message || 'Error al calcular correlativo de CITE' });
    }
  }

  public async getCiteStats(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      const canAccessAll = await this.canAccessGlobal360(user);
      const userAreaKey = await this.getUserAssignedAreaKey(user);

      const targetAreaKey = canAccessAll
        ? (req.query.areaKey && req.query.areaKey !== 'ALL' ? String(req.query.areaKey) : undefined)
        : userAreaKey;

      const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
      const stats = await this.officialCiteService.getCiteStats(year, targetAreaKey);
      return res.json({ success: true, data: { ...stats, filteredAreaKey: targetAreaKey, userAreaKey } });
    } catch (error: any) {
      logger.error('Error getting CITE stats:', error);
      return res.status(500).json({ error: error.message || 'Error al obtener estadísticas de CITEs' });
    }
  }

  public async listOfficialCites(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      const canAccessAll = await this.canAccessGlobal360(user);
      const userAreaKey = await this.getUserAssignedAreaKey(user);

      const { year, areaKey, docType, status, search, limit, offset } = req.query;

      // REGLA: Responsable solo puede ver los CITEs de su propia área
      const effectiveAreaKey = canAccessAll
        ? (areaKey && areaKey !== 'ALL' ? String(areaKey) : undefined)
        : userAreaKey;

      const result = await this.officialCiteService.listOfficialCites({
        year: year ? Number(year) : undefined,
        areaKey: effectiveAreaKey,
        docType: docType && docType !== 'ALL' ? String(docType) : undefined,
        status: status && status !== 'ALL' ? String(status) : undefined,
        search: search ? String(search) : undefined,
        limit: limit ? Number(limit) : 100,
        offset: offset ? Number(offset) : 0,
      });

      return res.json({
        success: true,
        data: result.items,
        total: result.total,
        meta: {
          userAreaKey,
          canAccessAllAreas: canAccessAll,
          effectiveAreaKey,
        },
      });
    } catch (error: any) {
      logger.error('Error listing official CITEs:', error);
      return res.status(500).json({ error: error.message || 'Error al listar libro de CITEs' });
    }
  }

  public async createOfficialCite(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      const canAccessAll = await this.canAccessGlobal360(user);
      const userAreaKey = await this.getUserAssignedAreaKey(user);

      let {
        areaKey,
        docType,
        year,
        recipient,
        recipientRole,
        recipientEntity,
        senderName,
        senderRole,
        initials,
        subject,
        bodyText,
        status,
        routeSheetId,
        officialDate,
      } = req.body;

      // REGLA: Responsable solo puede generar CITEs de su propia área
      if (!canAccessAll) {
        if (areaKey && areaKey !== userAreaKey) {
          const userCfg = OfficialCiteService.getAreaConfig(userAreaKey);
          return res.status(403).json({
            error: `No tiene autorización para generar CITEs de otra área. Su área oficial asignada es: ${userCfg?.name || userAreaKey} (${userAreaKey}).`,
          });
        }
        areaKey = userAreaKey;
      } else if (!areaKey) {
        areaKey = userAreaKey;
      }

      // Validar tipos de documentos permitidos para el área según el Instructivo JOFHR 022-2026
      const areaCfg = OfficialCiteService.getAreaConfig(areaKey);
      if (areaCfg && !areaCfg.allowedTypes.includes(docType)) {
        return res.status(403).json({
          error: `El tipo de documento '${docType}' no está permitido para el área '${areaCfg.name}' según el Instructivo JOFHR 022-2026. Tipos permitidos: ${areaCfg.allowedTypes.join(', ')}`,
        });
      }

      if (!recipient || !senderName || !senderRole || !subject) {
        return res.status(400).json({
          error: 'Faltan campos obligatorios para el registro oficial del CITE',
        });
      }

      const cite = await this.officialCiteService.createOfficialCite(
        {
          areaKey,
          docType,
          year,
          recipient,
          recipientRole,
          recipientEntity,
          senderName,
          senderRole,
          initials,
          subject,
          bodyText,
          status,
          routeSheetId,
          officialDate,
        },
        user?.userId || user?.id
      );

      return res.status(201).json({ success: true, data: cite });
    } catch (error: any) {
      logger.error('Error creating official CITE:', error);
      return res.status(500).json({ error: error.message || 'Error al generar CITE oficial' });
    }
  }

  public async getOfficialCiteById(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      const canAccessAll = await this.canAccessGlobal360(user);
      const userAreaKey = await this.getUserAssignedAreaKey(user);

      const { idOrCode } = req.params;
      const cite = await this.officialCiteService.getCiteById(idOrCode);
      if (!cite) {
        return res.status(404).json({ error: `CITE ${idOrCode} no encontrado` });
      }

      // REGLA: No puede ver CITEs de otras áreas
      const userId = user?.userId || user?.id;
      if (!canAccessAll && cite.areaKey !== userAreaKey && cite.createdById !== userId) {
        return res.status(403).json({ error: 'Acceso denegado: No puede consultar CITEs pertenecientes a otra área.' });
      }

      return res.json({ success: true, data: cite });
    } catch (error: any) {
      logger.error('Error getting official CITE:', error);
      return res.status(500).json({ error: error.message || 'Error al buscar CITE' });
    }
  }

  public async getOfficialCitePdf(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      const canAccessAll = await this.canAccessGlobal360(user);
      const userAreaKey = await this.getUserAssignedAreaKey(user);

      const { idOrCode } = req.params;
      const cite = await this.officialCiteService.getCiteById(idOrCode);
      if (!cite) {
        return res.status(404).json({ error: `CITE ${idOrCode} no encontrado` });
      }

      // REGLA: No puede descargar CITEs de otras áreas
      const userId = user?.userId || user?.id;
      if (!canAccessAll && cite.areaKey !== userAreaKey && cite.createdById !== userId) {
        return res.status(403).json({ error: 'Acceso denegado: No puede descargar documentos de otra área.' });
      }

      const pdfBuffer = await this.citePdfService.generateOfficialDocumentPdf({
        citeCode: cite.citeCode,
        docType: cite.docType,
        areaName: cite.areaName,
        areaKey: cite.areaKey,
        year: cite.year,
        recipient: cite.recipient,
        recipientRole: cite.recipientRole,
        recipientEntity: cite.recipientEntity,
        senderName: cite.senderName,
        senderRole: cite.senderRole,
        initials: cite.initials,
        subject: cite.subject,
        bodyText: cite.bodyText,
        officialDate: cite.officialDate,
      });

      const cleanFilename = cite.citeCode.replace(/[\/\s°N]/g, '_') + '.pdf';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${cleanFilename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (error: any) {
      logger.error('Error generating official CITE PDF:', error);
      return res.status(500).json({ error: error.message || 'Error al generar documento PDF del CITE' });
    }
  }

  public async updateOfficialCiteStatus(req: Request, res: Response): Promise<any> {
    try {
      const user = (req as any).user;
      const canAccessAll = await this.canAccessGlobal360(user);
      const userAreaKey = await this.getUserAssignedAreaKey(user);

      const { id } = req.params;
      const { status, cancellationReason } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'El campo status es requerido' });
      }

      const cite = await this.officialCiteService.getCiteById(id);
      if (!cite) {
        return res.status(404).json({ error: 'CITE no encontrado' });
      }

      if (!canAccessAll && cite.areaKey !== userAreaKey) {
        return res.status(403).json({ error: 'No tiene autorización para modificar CITEs de otra área.' });
      }

      const updated = await this.officialCiteService.updateCiteStatus(id, status, cancellationReason);
      return res.json({ success: true, data: updated });
    } catch (error: any) {
      logger.error('Error updating CITE status:', error);
      return res.status(500).json({ error: error.message || 'Error al actualizar estado del CITE' });
    }
  }

  public async linkCiteToRouteSheet(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { routeSheetId } = req.body;
      if (!routeSheetId) {
        return res.status(400).json({ error: 'routeSheetId es requerido' });
      }

      const linked = await this.officialCiteService.linkToRouteSheet(id, routeSheetId);
      return res.json({ success: true, data: linked });
    } catch (error: any) {
      logger.error('Error linking CITE to RouteSheet:', error);
      return res.status(500).json({ error: error.message || 'Error al vincular CITE a la Hoja de Ruta' });
    }
  }
}

