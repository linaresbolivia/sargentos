import { Request, Response, NextFunction } from 'express';
import { whatsappManager } from '../whatsappService';
import fs from 'fs';
import { prisma } from '@shared/infrastructure/prisma';

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
      const { text, link } = req.body;
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

      const imagePath = req.file ? req.file.path : undefined;

      const result = await this.getService(req).sendBulk(contacts, text, imagePath, link);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public async getChats(req: Request, res: Response, next: NextFunction) {
    try {
      // Could filter by clientId if we store it in DB, for now returning all chats
      const chats = await prisma.whatsAppChat.findMany({
        orderBy: { lastMessageAt: 'desc' },
        take: 50
      });
      res.json({ success: true, data: chats });
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

      await this.getService(req).sendBulk([{ nombre: '', telefono: phone }], text);
      
      res.json({ success: true, message: 'Enviado' });
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

