import { PrismaClient } from '@prisma/client';
import { socketService } from '@config/socket';
import { logger } from '@config/logger';

export interface SendChatMessageDto {
  channel: string;
  senderUserId: string;
  senderName: string;
  senderArea: string;
  message: string;
  routeSheetCode?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
}

export class CorrespondenceChatService {
  constructor(private prisma: PrismaClient) {}

  public async getMessages(channel: string = 'GENERAL', limit: number = 80) {
    try {
      const messages = await (this.prisma as any).corrChatMessage.findMany({
        where: channel === 'ALL' ? undefined : { channel },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });
      return messages;
    } catch (err) {
      logger.error('Error fetching chat messages', err);
      return [];
    }
  }

  public async sendMessage(data: SendChatMessageDto) {
    try {
      const created = await (this.prisma as any).corrChatMessage.create({
        data: {
          channel: data.channel || 'GENERAL',
          senderUserId: data.senderUserId,
          senderName: data.senderName,
          senderArea: data.senderArea,
          message: data.message.trim(),
          routeSheetCode: data.routeSheetCode ? data.routeSheetCode.trim() : null,
          fileUrl: data.fileUrl || null,
          fileName: data.fileName || null,
          fileType: data.fileType || null,
          fileSize: data.fileSize || null,
        },
      });

      // Realtime broadcast to all staff
      try {
        socketService.getIo()?.emit('correspondence:chat:message', created);
      } catch (sockErr) {
        logger.warn('Socket broadcast error for chat message', sockErr);
      }

      return created;
    } catch (err: any) {
      logger.error('Error saving chat message', err);
      throw new Error(err.message || 'Error al enviar mensaje de chat');
    }
  }
}
