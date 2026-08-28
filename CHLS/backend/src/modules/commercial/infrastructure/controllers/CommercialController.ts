import { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '@modules/auth/infrastructure/middlewares/auth.middleware';
import { whatsappManager } from '@modules/whatsapp/infrastructure/whatsappService';
import fs from 'fs';
import path from 'path';

export class CommercialController {
  public router = Router();
  private prisma = new PrismaClient();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use(authenticate);

    // VIP Passes endpoints (Admins, Staff, SuperAdmin)
    this.router.get('/passes', this.listVipPasses.bind(this));
    this.router.post('/passes', this.createVipPass.bind(this));
    this.router.get('/passes/:id', this.getVipPassById.bind(this));
    this.router.post('/passes/validate', this.validateVipPass.bind(this));
    this.router.patch('/passes/:id/revoke', this.revokeVipPass.bind(this));
    this.router.post('/passes/:id/send-whatsapp', this.sendVipPassWhatsApp.bind(this));

    // Leads & CRM endpoints
    this.router.get('/leads', this.listLeads.bind(this));
    this.router.post('/leads', this.createLead.bind(this));
    this.router.patch('/leads/:id', this.updateLead.bind(this));
    this.router.delete('/leads/:id', this.deleteLead.bind(this));

    // Commercial Stats & Insights
    this.router.get('/stats', this.getCommercialStats.bind(this));

    // Magazine Persistence Endpoints
    this.router.get('/magazine', this.getActiveMagazine.bind(this));
    this.router.post('/magazine', this.saveActiveMagazine.bind(this));
    this.router.delete('/magazine', this.resetActiveMagazine.bind(this));

    // Video Showcase Sync & Streaming Endpoints
    this.router.get('/videos', this.getCommercialVideos.bind(this));
    this.router.post('/videos', this.saveCommercialVideos.bind(this));
    this.router.post('/videos/upload', this.uploadCommercialVideo.bind(this));
    this.router.get('/videos/stream/:fileName', this.streamCommercialVideo.bind(this));
  }

  // 1. List VIP Passes
  public async listVipPasses(req: Request, res: Response) {
    try {
      const { status, search } = req.query;
      const whereClause: any = {};

      if (search) {
        const s = (search as string).trim();
        whereClause.OR = [
          { code: { contains: s, mode: 'insensitive' } },
          { guestFullName: { contains: s, mode: 'insensitive' } },
          { documentId: { contains: s, mode: 'insensitive' } },
          { phone: { contains: s, mode: 'insensitive' } }
        ];
      }

      const passes = await this.prisma.vipPass.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }
      });

      const now = new Date();
      const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const processedPasses = passes.map(pass => {
        const untilStr = (pass.validUntil instanceof Date ? pass.validUntil.toISOString() : String(pass.validUntil)).split('T')[0];

        const isDateExpired = nowStr > untilStr;
        const isUsesExhausted = pass.usageCount >= pass.maxUses;
        const isRevoked = pass.status === 'REVOCADO';

        let calculatedStatus = pass.status;
        if (isRevoked) {
          calculatedStatus = 'REVOCADO';
        } else if (isUsesExhausted) {
          calculatedStatus = 'USADO';
        } else if (isDateExpired) {
          calculatedStatus = 'EXPIRADO';
        } else {
          calculatedStatus = 'ACTIVO';
        }

        return {
          ...pass,
          isExpired: calculatedStatus === 'EXPIRADO',
          status: calculatedStatus,
          effectiveStatus: calculatedStatus
        };
      });

      let filteredPasses = processedPasses;
      if (status && status !== 'ALL') {
        const targetStatus = (status as string).toUpperCase();
        filteredPasses = processedPasses.filter(p => p.status === targetStatus || p.effectiveStatus === targetStatus);
      }

      return res.status(200).json({ success: true, data: filteredPasses });
    } catch (error: any) {
      console.error('Error listing passes:', error);
      return res.status(500).json({ success: false, message: 'Error al listar pases' });
    }
  }

  // 2. Create Pass
  public async createVipPass(req: Request, res: Response) {
    try {
      const {
        guestFullName,
        documentId,
        phone,
        email,
        hostSellerName,
        validFrom,
        validUntil,
        maxDays,
        timeStart,
        timeEnd,
        allowedAreas,
        maxUses,
        notes
      } = req.body;

      if (!guestFullName || !validFrom || !validUntil) {
        return res.status(400).json({
          success: false,
          message: 'Nombre del invitado y fechas de vigencia son obligatorios'
        });
      }

      // Generate a distinct security code (e.g. CHLS-7392)
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const passCode = `CHLS-${randomSuffix}`;

      // Clean and standardize date strings (YYYY-MM-DD) and store as UTC midday (12:00:00Z) to prevent timezone shifts
      const cleanFromStr = String(validFrom).split('T')[0];
      const cleanUntilStr = String(validUntil).split('T')[0];
      const fromDateObj = new Date(`${cleanFromStr}T12:00:00.000Z`);
      const untilDateObj = new Date(`${cleanUntilStr}T12:00:00.000Z`);

      const newPass = await this.prisma.vipPass.create({
        data: {
          code: passCode,
          guestFullName: guestFullName.trim(),
          documentId: documentId?.trim() || null,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          hostSellerName: hostSellerName?.trim() || 'Eduardo Bejarano',
          validFrom: fromDateObj,
          validUntil: untilDateObj,
          maxDays: parseInt(maxDays) || 1,
          timeStart: timeStart || '07:00',
          timeEnd: timeEnd || '22:00',
          allowedAreas: Array.isArray(allowedAreas) ? allowedAreas.join(',') : (allowedAreas || 'INGRESO,PISCINA,GIMNASIO,TENIS,HIPICA,RESTAURANTE'),
          status: 'ACTIVO',
          usageCount: 0,
          maxUses: parseInt(maxUses) || 10,
          notes: notes?.trim() || null
        }
      });

      return res.status(201).json({
        success: true,
        message: '¡Pase de Cortesía emitido exitosamente!',
        data: newPass
      });
    } catch (error: any) {
      console.error('Error creating pass:', error);
      return res.status(500).json({ success: false, message: 'Error al emitir pase' });
    }
  }

  // 3. Get Pass by ID or Code
  public async getVipPassById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pass = await this.prisma.vipPass.findFirst({
        where: {
          OR: [{ id }, { code: id }]
        }
      });

      if (!pass) {
        return res.status(404).json({ success: false, message: 'Pase no encontrado' });
      }

      return res.status(200).json({ success: true, data: pass });
    } catch (error: any) {
      console.error('Error getting pass:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener pase' });
    }
  }

  // 4. Validate Pass (Scanner validation at Ingreso or Specific Areas)
  public async validateVipPass(req: Request, res: Response) {
    try {
      const { code, area = 'INGRESO', registerLog = true } = req.body;

      if (!code) {
        return res.status(400).json({ success: false, message: 'Código de Pase es obligatorio' });
      }

      // Search pass by exact code or document ID
      const cleanedCode = code.trim();
      const pass = await this.prisma.vipPass.findFirst({
        where: {
          OR: [
            { code: { equals: cleanedCode, mode: 'insensitive' } },
            { documentId: { equals: cleanedCode, mode: 'insensitive' } }
          ]
        }
      });

      if (!pass) {
        return res.status(404).json({
          success: false,
          granted: false,
          reason: 'Pase no registrado en el sistema comercial CHLS'
        });
      }

      const now = new Date();
      const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const fromStr = (pass.validFrom instanceof Date ? pass.validFrom.toISOString() : String(pass.validFrom)).split('T')[0];
      const untilStr = (pass.validUntil instanceof Date ? pass.validUntil.toISOString() : String(pass.validUntil)).split('T')[0];

      // 1. Status Check
      if (pass.status === 'REVOCADO') {
        return res.status(200).json({
          success: true,
          granted: false,
          reason: 'Pase REVOCADO por la administración',
          pass
        });
      }

      // 2. Date Range Check
      if (nowStr < fromStr) {
        const [y, m, d] = fromStr.split('-').map(Number);
        const dispFrom = new Date(y, m - 1, d).toLocaleDateString('es-BO');
        return res.status(200).json({
          success: true,
          granted: false,
          reason: `Pase aún no vigente. Válido a partir del ${dispFrom}`,
          pass
        });
      }

      if (nowStr > untilStr) {
        // Auto update status
        await this.prisma.vipPass.update({
          where: { id: pass.id },
          data: { status: 'EXPIRADO' }
        });
        const [y, m, d] = untilStr.split('-').map(Number);
        const dispUntil = new Date(y, m - 1, d).toLocaleDateString('es-BO');
        return res.status(200).json({
          success: true,
          granted: false,
          reason: `Pase EXPIRADO el ${dispUntil}`,
          pass: { ...pass, status: 'EXPIRADO' }
        });
      }

      // 3. Time Window Check (e.g. 07:00 - 22:00)
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

      if (pass.timeStart && pass.timeEnd) {
        if (currentTimeStr < pass.timeStart || currentTimeStr > pass.timeEnd) {
          return res.status(200).json({
            success: true,
            granted: false,
            reason: `Fuera del horario autorizado (${pass.timeStart} a ${pass.timeEnd} hrs). Hora actual: ${currentTimeStr}`,
            pass
          });
        }
      }

      // 4. Area Check (e.g. INGRESO, PISCINA, GIMNASIO, TENIS, HIPICA, RESTAURANTE)
      const allowedAreasList = (pass.allowedAreas || '').toUpperCase().split(',').map(a => a.trim());
      const targetArea = area.toUpperCase().trim();

      // Normalize INGRESO / GARITA / PRINCIPAL
      const isIngresoTarget = ['INGRESO', 'GARITA', 'PUERTA PRINCIPAL', 'INGRESO PRINCIPAL'].includes(targetArea);
      const isAreaPermitted = isIngresoTarget 
        ? allowedAreasList.some(a => ['INGRESO', 'GARITA', 'PUERTA PRINCIPAL', 'ALL'].includes(a))
        : allowedAreasList.includes(targetArea) || allowedAreasList.includes('ALL');

      if (!isAreaPermitted) {
        return res.status(200).json({
          success: true,
          granted: false,
          reason: `Área '${targetArea}' no autorizada para este Pase. Áreas permitidas: ${allowedAreasList.join(', ')}`,
          pass
        });
      }

      // 5. Max usage check
      if (pass.usageCount >= pass.maxUses) {
        return res.status(200).json({
          success: true,
          granted: false,
          reason: `Límite de usos alcanzado (${pass.usageCount}/${pass.maxUses} ingresos)`,
          pass
        });
      }

      // If valid and registerLog is requested, increment usage and write AccessLog / AreaAccessLog
      let updatedPass = pass;
      if (registerLog) {
        updatedPass = await this.prisma.vipPass.update({
          where: { id: pass.id },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: now,
            status: pass.usageCount + 1 >= pass.maxUses ? 'USADO' : 'ACTIVO'
          }
        });

        // Register in AccessLog
        await this.prisma.accessLog.create({
          data: {
            gate: isIngresoTarget ? 'Ingreso Principal' : `Acceso ${targetArea}`,
            method: 'QR Pase Cortesía',
            actionType: 'ENTRY',
            personType: 'INVITADO_CORTESIA',
            status: 'GRANTED',
            reason: `Pase Comercial (${pass.code})`,
            observation: `Invitado de ${pass.hostSellerName}. Documento: ${pass.documentId || 'N/A'}`
          }
        });
      }

      return res.status(200).json({
        success: true,
        granted: true,
        message: '¡Pase Válido! Acceso autorizado.',
        pass: updatedPass,
        guest: {
          fullName: pass.guestFullName,
          documentId: pass.documentId,
          hostSellerName: pass.hostSellerName,
          allowedAreas: allowedAreasList,
          validUntil: pass.validUntil,
          usageCount: updatedPass.usageCount,
          maxUses: pass.maxUses
        }
      });

    } catch (error: any) {
      console.error('Error validating pass:', error);
      return res.status(500).json({ success: false, message: 'Error al validar pase' });
    }
  }

  // 5. Revoke Pass
  public async revokeVipPass(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pass = await this.prisma.vipPass.update({
        where: { id },
        data: { status: 'REVOCADO' }
      });

      return res.status(200).json({
        success: true,
        message: 'Pase revocado correctamente',
        data: pass
      });
    } catch (error: any) {
      console.error('Error revoking pass:', error);
      return res.status(500).json({ success: false, message: 'Error al revocar pase' });
    }
  }

  // 6. Send Pass via WhatsApp (Commercial Channel chls-comercial)
  public async sendVipPassWhatsApp(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { mediaBase64, customPhone } = req.body;

      const pass = await this.prisma.vipPass.findFirst({
        where: { OR: [{ id }, { code: id }] }
      });

      if (!pass) {
        return res.status(404).json({ success: false, message: 'Pase no encontrado' });
      }

      const targetPhone = (customPhone || pass.phone || '').trim();
      if (!targetPhone) {
        return res.status(400).json({ success: false, message: 'El pase no tiene un número de celular registrado' });
      }

      const formatDisplayDateEs = (d: Date | string): string => {
        const str = (d instanceof Date ? d.toISOString() : String(d)).split('T')[0];
        const [y, m, day] = str.split('-').map(Number);
        const date = new Date(y, m - 1, day);
        return date.toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });
      };

      const fromDate = formatDisplayDateEs(pass.validFrom);
      const untilDate = formatDisplayDateEs(pass.validUntil);
      const dateText = fromDate === untilDate ? fromDate : `Del ${fromDate} al ${untilDate}`;
      const allowedAreasList = (pass.allowedAreas || '').split(',').join(', ');

      const docText = pass.documentId ? pass.documentId : 'Registrado';

      const messageText = `🏛️ *CLUB HÍPICO LOS SARGENTOS*
🌟 *Pase de Cortesía*

Señor (a): *${pass.guestFullName}*, es un honor invitarl@ a conocer y disfrutar de nuestras instalaciones.

🎟️ *Código de Pase:* ${pass.code}
📅 *Vigencia:* ${dateText}
⏰ *Horario Autorizado:* ${pass.timeStart} a ${pass.timeEnd} hrs
📍 *Áreas Autorizadas:* ${allowedAreasList}
👥 *Acompañantes Autorizados:* ${pass.maxUses}
👤 *Ejecutivo:* ${pass.hostSellerName}

Al llegar al *Ingreso Principal*, por favor presente su documento de identidad (*${docText}*) y el *Código de Pase* para su ingreso preferencial.

_¡Esperamos disfrute de nuestras instalaciones durante su estadía!_`;

      const waClient = whatsappManager.getInstance('chls-comercial');
      if (waClient.status !== 'CONNECTED') {
        return res.status(400).json({
          success: false,
          code: 'WA_NOT_CONNECTED',
          message: 'El WhatsApp Comercial (Canal 5) no está conectado aún. Escanea el código QR en la cabecera para vincular la línea.'
        });
      }

      let formattedPhone = targetPhone.replace(/[^0-9]/g, '');
      if (formattedPhone.length === 8) {
        formattedPhone = `591${formattedPhone}`;
      }

      await waClient.sendMessage(formattedPhone, messageText, mediaBase64);

      return res.status(200).json({
        success: true,
        message: `¡Pase enviado exitosamente por WhatsApp Comercial a +${formattedPhone}!`,
        data: { passId: pass.id, sentTo: formattedPhone }
      });
    } catch (error: any) {
      console.error('Error sending pass via WhatsApp Comercial:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error al enviar pase por WhatsApp Comercial'
      });
    }
  }

  // 6. List CRM Leads
  public async listLeads(req: Request, res: Response) {
    try {
      const { status } = req.query;
      const whereClause: any = {};
      if (status && status !== 'ALL') {
        whereClause.status = status as string;
      }

      const leads = await this.prisma.commercialLead.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json({ success: true, data: leads });
    } catch (error: any) {
      console.error('Error listing leads:', error);
      return res.status(500).json({ success: false, message: 'Error al listar prospectos' });
    }
  }

  // 7. Create Lead
  public async createLead(req: Request, res: Response) {
    try {
      const {
        fullName,
        documentId,
        phone,
        email,
        company,
        position,
        categoryInterest,
        sponsorMember1,
        sponsorMember2,
        sellerName,
        budgetEstimated,
        notes
      } = req.body;

      if (!fullName) {
        return res.status(400).json({ success: false, message: 'El nombre del prospecto es obligatorio' });
      }

      const lead = await this.prisma.commercialLead.create({
        data: {
          fullName: fullName.trim(),
          documentId: documentId?.trim() || null,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          company: company?.trim() || null,
          position: position?.trim() || null,
          categoryInterest: categoryInterest || 'FAMILIAR',
          status: 'NUEVO_LEAD',
          sponsorMember1: sponsorMember1?.trim() || null,
          sponsorMember2: sponsorMember2?.trim() || null,
          sellerName: sellerName?.trim() || 'Eduardo (Comercial)',
          budgetEstimated: budgetEstimated ? parseFloat(budgetEstimated) : null,
          notes: notes?.trim() || null
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Prospecto registrado exitosamente en el Pipeline Comercial',
        data: lead
      });
    } catch (error: any) {
      console.error('Error creating lead:', error);
      return res.status(500).json({ success: false, message: 'Error al crear prospecto' });
    }
  }

  // 8. Update Lead
  public async updateLead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      delete updateData.id;
      delete updateData.createdAt;

      const lead = await this.prisma.commercialLead.update({
        where: { id },
        data: updateData
      });

      return res.status(200).json({ success: true, message: 'Prospecto actualizado', data: lead });
    } catch (error: any) {
      console.error('Error updating lead:', error);
      return res.status(500).json({ success: false, message: 'Error al actualizar prospecto' });
    }
  }

  // 9. Delete Lead
  public async deleteLead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await this.prisma.commercialLead.delete({ where: { id } });
      return res.status(200).json({ success: true, message: 'Prospecto eliminado' });
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar prospecto' });
    }
  }

  // 10. Commercial Dashboard Stats
  public async getCommercialStats(req: Request, res: Response) {
    try {
      const totalPasses = await this.prisma.vipPass.count();
      const activePasses = await this.prisma.vipPass.count({ where: { status: 'ACTIVO' } });
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const usedToday = await this.prisma.vipPass.count({
        where: {
          lastUsedAt: { gte: today }
        }
      });

      const totalLeads = await this.prisma.commercialLead.count();
      const leadsByStatus = await this.prisma.commercialLead.groupBy({
        by: ['status'],
        _count: { id: true }
      });

      return res.status(200).json({
        success: true,
        data: {
          totalPasses,
          activePasses,
          usedToday,
          totalLeads,
          leadsByStatus: leadsByStatus.reduce((acc: any, curr) => {
            acc[curr.status] = curr._count.id;
            return acc;
          }, {})
        }
      });
    } catch (error: any) {
      console.error('Error getting commercial stats:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener estadísticas comerciales' });
    }
  }

  // 11. Get Active Magazine
  public async getActiveMagazine(req: Request, res: Response) {
    try {
      const storageDir = path.join(process.cwd(), 'storage');
      const filePath = path.join(storageDir, 'active_magazine.json');

      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        return res.status(200).json({ success: true, ...data });
      }

      return res.status(200).json({
        success: true,
        isCustom: false,
        fileName: null,
        pages: [],
        pageAspectRatio: null
      });
    } catch (error: any) {
      console.error('Error getting active magazine:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener revista activa' });
    }
  }

  // 12. Save Active Magazine
  public async saveActiveMagazine(req: Request, res: Response) {
    try {
      const { fileName, pages, pageAspectRatio } = req.body;

      if (!pages || !Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({ success: false, message: 'Se requieren las páginas de la revista' });
      }

      const storageDir = path.join(process.cwd(), 'storage');
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      const filePath = path.join(storageDir, 'active_magazine.json');
      const payload = {
        isCustom: true,
        fileName: fileName || 'Revista Personalizada CHLS.pdf',
        pages,
        pageAspectRatio: pageAspectRatio || null,
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(filePath, JSON.stringify(payload), 'utf-8');

      return res.status(200).json({
        success: true,
        message: '¡Revista guardada y publicada exitosamente para todos los dispositivos!',
        data: payload
      });
    } catch (error: any) {
      console.error('Error saving active magazine:', error);
      return res.status(500).json({ success: false, message: 'Error al guardar la revista' });
    }
  }

  // 13. Reset Active Magazine to Official CHLS Default
  public async resetActiveMagazine(req: Request, res: Response) {
    try {
      const storageDir = path.join(process.cwd(), 'storage');
      const filePath = path.join(storageDir, 'active_magazine.json');

      const payload = {
        isCustom: false,
        fileName: null,
        pages: [],
        pageAspectRatio: null,
        updatedAt: new Date().toISOString()
      };

      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(payload), 'utf-8');

      return res.status(200).json({
        success: true,
        message: '¡Revista restablecida a la Edición Oficial Institucional CHLS!',
        data: payload
      });
    } catch (error: any) {
      console.error('Error resetting active magazine:', error);
      return res.status(500).json({ success: false, message: 'Error al restablecer la revista' });
    }
  }

  // 14. Get Commercial Videos
  public async getCommercialVideos(req: Request, res: Response) {
    try {
      const storageDir = path.join(process.cwd(), 'storage');
      const filePath = path.join(storageDir, 'commercial_videos.json');

      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        return res.status(200).json({ success: true, videos: data });
      }

      // Default initial video if none saved yet
      const defaultVideos = [
        {
          id: 'vid_yt_chls100',
          title: 'CHLS - Video Institucional Club Hípico',
          url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
          isCustom: false,
        }
      ];

      return res.status(200).json({ success: true, videos: defaultVideos });
    } catch (error: any) {
      console.error('Error getting commercial videos:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener videos' });
    }
  }

  // 15. Save Commercial Videos
  public async saveCommercialVideos(req: Request, res: Response) {
    try {
      const { videos } = req.body;
      if (!Array.isArray(videos)) {
        return res.status(400).json({ success: false, message: 'Se requiere una lista de videos' });
      }

      const storageDir = path.join(process.cwd(), 'storage');
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      const filePath = path.join(storageDir, 'commercial_videos.json');
      fs.writeFileSync(filePath, JSON.stringify(videos), 'utf-8');

      return res.status(200).json({
        success: true,
        message: '¡Lista de videos actualizada para todos los dispositivos!',
        videos
      });
    } catch (error: any) {
      console.error('Error saving commercial videos:', error);
      return res.status(500).json({ success: false, message: 'Error al guardar lista de videos' });
    }
  }

  // 16. Upload Large Video File (up to 1 GB .MOV / .MP4)
  public async uploadCommercialVideo(req: Request, res: Response) {
    try {
      const uploadsDir = path.join(process.cwd(), 'storage', 'uploads_videos');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const rawExt = (req.headers['x-file-extension'] as string) || '.mp4';
      const ext = rawExt.startsWith('.') ? rawExt : `.${rawExt}`;
      const fileName = `video_${Date.now()}_${Math.random().toString(36).substr(2, 5)}${ext}`;
      const savePath = path.join(uploadsDir, fileName);

      const writeStream = fs.createWriteStream(savePath);
      req.pipe(writeStream);

      req.on('end', async () => {
        const rawTitle = (req.headers['x-video-title'] as string) || 'Video Institucional HD';
        const title = decodeURIComponent(rawTitle);
        const videoUrl = `/api/commercial/videos/stream/${fileName}`;

        const newVideoItem = {
          id: `vid_server_${Date.now()}`,
          title: `📹 [SERVIDOR] ${title}`,
          url: videoUrl,
          isCustom: true,
          isUploaded: true
        };

        const storageDir = path.join(process.cwd(), 'storage');
        const jsonPath = path.join(storageDir, 'commercial_videos.json');
        let currentVideos: any[] = [];
        if (fs.existsSync(jsonPath)) {
          try {
            currentVideos = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          } catch (e) {}
        }
        currentVideos.unshift(newVideoItem);
        fs.writeFileSync(jsonPath, JSON.stringify(currentVideos), 'utf-8');

        res.status(200).json({
          success: true,
          message: 'Video subido e indexado exitosamente',
          video: newVideoItem,
          videos: currentVideos
        });
      });

      req.on('error', (err) => {
        console.error('Error writing video file:', err);
        res.status(500).json({ success: false, message: 'Error durante la transferencia del archivo de video' });
      });
    } catch (error: any) {
      console.error('Error uploading video:', error);
      res.status(500).json({ success: false, message: 'Error al subir video' });
    }
  }

  // 17. Stream Video File with HTTP 206 Range Requests (Smooth Streaming for 600MB+ MOV/MP4)
  public async streamCommercialVideo(req: Request, res: Response): Promise<any> {
    try {
      const fileName = req.params.fileName;
      const filePath = path.join(process.cwd(), 'storage', 'uploads_videos', fileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'Video no encontrado' });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      const ext = path.extname(fileName).toLowerCase();
      const contentType = ext === '.mov' 
        ? 'video/quicktime' 
        : (ext === '.webm' ? 'video/webm' : (ext === '.ogg' ? 'video/ogg' : 'video/mp4'));

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
        };
        res.writeHead(206, head);
        file.pipe(res);
        return;
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    } catch (error: any) {
      console.error('Error streaming video:', error);
      return res.status(500).json({ success: false, message: 'Error en el streaming del video' });
    }
  }
}
