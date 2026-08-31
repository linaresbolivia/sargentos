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

  public async getMessages(channel: string = 'GENERAL', limit: number = 80, readerUserId?: string) {
    try {
      const messages = await (this.prisma as any).corrChatMessage.findMany({
        where: channel === 'ALL' ? undefined : { channel },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });

      // If channel is a DM and reader opened it, mark incoming messages as READ
      if (channel.startsWith('dm_') && readerUserId) {
        this.markAsRead(channel, readerUserId).catch((err) => {
          logger.warn('Non-blocking error marking chat messages as read', err);
        });
      }

      return messages;
    } catch (err) {
      logger.error('Error fetching chat messages', err);
      return [];
    }
  }

  public async markAsRead(channel: string, readerUserId: string) {
    try {
      if (!channel || !readerUserId) return { count: 0 };

      // Update all messages in this channel not sent by this reader
      const updated = await (this.prisma as any).corrChatMessage.updateMany({
        where: {
          channel,
          senderUserId: { not: readerUserId },
          status: { not: 'READ' },
        },
        data: {
          status: 'READ',
          readAt: new Date(),
        },
      });

      if (updated.count > 0) {
        try {
          socketService.getIo()?.emit('correspondence:chat:read', {
            channel,
            readerUserId,
            readAt: new Date().toISOString(),
          });
        } catch (sockErr) {
          logger.warn('Socket broadcast error for chat read receipts', sockErr);
        }
      }

      return updated;
    } catch (err: any) {
      logger.error('Error marking messages as read', err);
      return { count: 0 };
    }
  }

  public async sendMessage(data: SendChatMessageDto) {
    try {
      // Determine initial delivery status (SENT = 1 tick vs DELIVERED = 2 ticks)
      let initialStatus = 'SENT';
      if (data.channel.startsWith('dm_')) {
        const parts = data.channel.split('_').slice(1);
        const senderUName = (data.senderName || data.senderUserId || '').toLowerCase();
        const otherUsername = parts.find((p) => !senderUName.includes(p.toLowerCase())) || parts[0];

        if (otherUsername) {
          const presenceMap = socketService.getAllPresence();
          const targetPresence = presenceMap[otherUsername.toLowerCase()];
          if (targetPresence && (targetPresence.status === 'ONLINE' || targetPresence.status === 'AWAY')) {
            initialStatus = 'DELIVERED';
          }
        }
      } else {
        // In general group channels, messages reach the active pool
        initialStatus = 'DELIVERED';
      }

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
          status: initialStatus,
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
