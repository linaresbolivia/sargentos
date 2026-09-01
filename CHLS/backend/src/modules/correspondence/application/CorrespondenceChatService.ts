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
  replyToId?: string | null;
  replyToSenderName?: string | null;
  replyToText?: string | null;
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

  public async markAsRead(channel: string, readerIdentifier: string) {
    try {
      if (!channel || !readerIdentifier) return { count: 0 };
      const readerLow = readerIdentifier.toLowerCase().trim();
      const readerUsername = readerLow.split('@')[0];

      // Find all unread messages in this channel
      const unreadMessages = await (this.prisma as any).corrChatMessage.findMany({
        where: {
          channel,
          status: { not: 'READ' },
        },
      });

      // Filter only incoming messages (messages sent by someone OTHER than reader)
      const incomingMessageIds = unreadMessages
        .filter((m: any) => {
          const sUserId = (m.senderUserId || '').toLowerCase();
          const sName = (m.senderName || '').toLowerCase();
          const isFromReader =
            sUserId === readerLow ||
            sName === readerLow ||
            sUserId.includes(readerUsername) ||
            sName.includes(readerUsername) ||
            sUserId.split('@')[0] === readerUsername ||
            sName.split('@')[0] === readerUsername;
          return !isFromReader;
        })
        .map((m: any) => m.id);

      if (incomingMessageIds.length === 0) return { count: 0 };

      const updated = await (this.prisma as any).corrChatMessage.updateMany({
        where: {
          id: { in: incomingMessageIds },
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
            readerUserId: readerUsername,
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
        const senderLow = (data.senderName || data.senderUserId || '').toLowerCase();
        const otherUsername = parts.find((p) => !senderLow.includes(p.toLowerCase())) || parts[0];

        if (otherUsername) {
          const targetUName = otherUsername.toLowerCase().split('@')[0];
          const presenceMap = socketService.getAllPresence();
          const targetPresence =
            presenceMap[targetUName] ||
            Object.values(presenceMap).find(
              (p) =>
                p.username.toLowerCase() === targetUName ||
                p.username.toLowerCase().startsWith(targetUName) ||
                p.userId?.toLowerCase() === targetUName
            );

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
          replyToId: data.replyToId || null,
          replyToSenderName: data.replyToSenderName || null,
          replyToText: data.replyToText || null,
        },
      });

      // Realtime broadcast to all staff
      try {
        socketService.getIo()?.emit('correspondence:chat:message', created);
      } catch (sockErr) {
        logger.warn('Socket broadcast error for chat message', sockErr);
      }

      // If sending a reply in DM, automatically mark incoming messages as READ
      if (data.channel.startsWith('dm_')) {
        this.markAsRead(data.channel, data.senderUserId || data.senderName).catch((err) => {
          logger.warn('Non-blocking auto-read on reply in DM', err);
        });
      }

      return created;
    } catch (err: any) {
      logger.error('Error saving chat message', err);
      throw new Error(err.message || 'Error al enviar mensaje de chat');
    }
  }
}
