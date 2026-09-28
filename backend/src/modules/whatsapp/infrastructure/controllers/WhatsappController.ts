import { Request, Response, NextFunction } from 'express';
import { whatsappManager } from '../whatsappService';
import fs from 'fs';
import path from 'path';
import { prisma } from '@shared/infrastructure/prisma';
import { botSessionManager } from '../../domain/botSessionManager';

export class WhatsappController {
  private getService(req: Request) {
    const clientId = req.params.clientId || 'chls-masivo';
    return whatsappManager.getInstance(clientId);
  }

  public async getStatus(req: Request, res: Response): Promise<any> {
    try {
      const status = this.getService(req).getStatus();
      res.status(200).json({ success: true, data: status });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async startSession(req: Request, res: Response): Promise<any> {
    try {
      this.getService(req).start(); // Non-blocking
      res.status(200).json({ success: true, message: 'Initializing session...' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async logout(req: Request, res: Response): Promise<any> {
    try {
      await this.getService(req).logout();
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async sendBulk(req: Request, res: Response): Promise<any> {
    try {
      const { text, link, removeImage } = req.body;
      let contacts = [];
      
      try {
        contacts = JSON.parse(req.body.contacts);
      } catch (e) {
        res.status(400).json({ success: false, message: 'Invalid contacts format' });
        return;
      }

      if (!contacts || contacts.length === 0) {
        res.status(400).json({ success: false, message: 'Contacts list is required' });
        return;
      }

      if (!text) {
        res.status(400).json({ success: false, message: 'Text message is required' });
        return;
      }

      let imagePath = req.file ? req.file.path : undefined;

      // Si no se envió archivo nuevo pero tampoco se indicó quitar imagen, buscar la imagen por defecto qr-pagos.jpg
      if (!imagePath && removeImage !== 'true' && removeImage !== true) {
        const possiblePaths = [
          path.resolve(process.cwd(), '../frontend/src/assets/qr-pagos.jpg'),
          path.resolve(process.cwd(), 'src/assets/qr-pagos.jpg'),
          path.resolve(process.cwd(), 'frontend/src/assets/qr-pagos.jpg'),
          'C:\\Users\\HP\\Documents\\CHLS\\frontend\\src\\assets\\qr-pagos.jpg'
        ];
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            imagePath = p;
            break;
          }
        }
      }

      const result = await this.getService(req).sendBulk(contacts, text, imagePath, link);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (req.file && fs.existsSync(req.file.path) && req.file.path.includes('tmp')) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {}
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async getChats(req: Request, res: Response, next: NextFunction) {
    try {
      const chats = await prisma.whatsAppChat.findMany({
        orderBy: { lastMessageAt: 'desc' },
        take: 100
      });

      const validChats = chats.filter(c => {
        const clean = c.phone.replace(/@.*$/, '').replace(/[^0-9]/g, '');
        return clean.length >= 8 && clean.length <= 12 && !clean.startsWith('505106') && !clean.startsWith('561379');
      });

      const enrichedChats = await Promise.all(
        validChats.map(async (chat) => {
          const cleanPhone = chat.phone.replace(/@.*$/, '').replace(/[^0-9]/g, '');
          const sessionInfo = botSessionManager.getSessionInfo(cleanPhone);

          const formattedPhone = cleanPhone.startsWith('591') && cleanPhone.length === 11
            ? `+591 ${cleanPhone.substring(3, 7)} ${cleanPhone.substring(7)}`
            : cleanPhone.length === 8
              ? `+591 ${cleanPhone.substring(0, 4)} ${cleanPhone.substring(4)}`
              : `+${cleanPhone}`;

          let displayName = chat.contactName;
          let member = sessionInfo?.member;

          if (!member) {
            const searchPhone = cleanPhone.replace(/^591/, '');
            const person = await prisma.person.findFirst({
              where: {
                OR: [
                  { phone: { contains: searchPhone } },
                  { mobile: { contains: searchPhone } }
                ]
              },
              include: {
                titularMemberships: { include: { type: true } },
                socialFeeAccruals: { where: { status: { in: ['PENDIENTE', 'PARCIAL'] } } }
              }
            });

            if (person) {
              const memNum = person.titularMemberships[0]?.membershipNumber || 'S/N';
              displayName = `${person.firstName} ${person.paternalSurname || person.lastName || ''} (Acción #${memNum})`.trim();
              const unpaidTotal = person.socialFeeAccruals.reduce((sum, f) => sum + Number(f.residualBalance || f.baseAmount || 0), 0);
              member = {
                id: person.id,
                fullName: `${person.firstName} ${person.paternalSurname || person.lastName || ''}`.trim(),
                documentId: person.documentId,
                membershipNumber: memNum,
                membershipType: person.titularMemberships[0]?.type?.name || 'Titular',
                membershipStatus: person.titularMemberships[0]?.status || 'ACTIVA',
                totalDebt: unpaidTotal
              };
            }
          }

          if (!displayName || displayName === chat.phone || /^[0-9]+$/.test(displayName)) {
            displayName = formattedPhone;
          }

          return {
            ...chat,
            phoneFormatted: formattedPhone,
            contactName: displayName,
            isHumanHandoff: sessionInfo?.isHumanHandoff || false,
            botState: sessionInfo?.state || 'MAIN_MENU',
            member: member || null
          };
        })
      );

      res.json({ success: true, data: enrichedChats });
    } catch (error) {
      next(error);
    }
  }

  public async getChatMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { chatId } = req.params;
      const messages = await prisma.whatsAppMessage.findMany({
        where: { chatId },
        orderBy: { timestamp: 'asc' }
      });
      
      await prisma.whatsAppChat.update({
        where: { id: chatId },
        data: { unreadCount: 0 }
      });

      res.json({ success: true, data: messages });
    } catch (error) {
      next(error);
    }
  }

  public async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, text } = req.body;
      if (!phone || !text) {
        res.status(400).json({ success: false, error: 'Phone and text are required' });
        return;
      }

      // Priorizar instancia Call Center o la instancia activa solicitada
      let service = req.params.clientId ? whatsappManager.getInstance(req.params.clientId) : null;
      if (!service || service.status !== 'CONNECTED') {
        const callCenter = whatsappManager.getInstance('chls-callcenter');
        if (callCenter.status === 'CONNECTED') {
          service = callCenter;
        } else {
          service = this.getService(req);
        }
      }

      let cleanPhone = phone.replace(/@.*$/, '').replace(/[^0-9]/g, '');
      if (cleanPhone.length === 8) {
        cleanPhone = `591${cleanPhone}`;
      }

      // Enviar por el servicio activo (usa la cola de digitación humana y guarda en base de datos)
      await service.sendMessage(cleanPhone, text);

      // Obtener el mensaje registrado para retornarlo a la interfaz
      const chat = await prisma.whatsAppChat.findFirst({
        where: {
          OR: [
            { phone: cleanPhone },
            { phone: cleanPhone.replace(/^591/, '') }
          ]
        }
      });

      const createdMessage = chat ? await prisma.whatsAppMessage.findFirst({
        where: { chatId: chat.id },
        orderBy: { timestamp: 'desc' }
      }) : null;
      
      res.json({ success: true, message: 'Enviado', data: createdMessage });
    } catch (error) {
      next(error);
    }
  }

  public async toggleHandoff(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.params;
      const { isHandoff } = req.body;
      const cleanPhone = phone.replace(/@.*$/, '').replace(/[^0-9]/g, '');
      botSessionManager.setHandoff(cleanPhone, !!isHandoff);

      try {
        const { socketService } = require('@config/socket');
        socketService.getIo()?.emit('whatsapp:handoff_change', { phone: cleanPhone, isHumanHandoff: !!isHandoff });
      } catch (e) {}

      res.json({ success: true, isHumanHandoff: !!isHandoff });
    } catch (error) {
      next(error);
    }
  }

  public async toggleBot(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const clientId = req.params.clientId || 'chls-masivo';
      const instance = whatsappManager.getInstance(clientId);
      const { isActive } = req.body;
      
      if (typeof isActive === 'boolean') {
        instance.isBotActive = isActive;
      }
      
      res.json({ success: true, isBotActive: instance.isBotActive });
    } catch (error) {
      next(error);
    }
  }
}


