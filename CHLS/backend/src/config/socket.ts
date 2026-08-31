import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from './env';
import { logger } from './logger';

export type UserPresenceStatus = 'ONLINE' | 'AWAY' | 'OFFLINE';

export interface UserPresenceInfo {
  userId: string;
  username: string;
  status: UserPresenceStatus;
  lastSeen: string; // ISO String
}

class SocketService {
  private io: Server | null = null;
  private socketToUser = new Map<string, string>(); // socketId -> username
  private userPresence = new Map<
    string,
    {
      userId: string;
      username: string;
      status: UserPresenceStatus;
      lastSeen: Date;
      sockets: Set<string>;
    }
  >();

  public init(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: (env as any).CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
      },
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info(`Cliente conectado vía WebSocket: ${socket.id}`);

      // Send initial presence state to newly connected client
      socket.emit('user:presence:all', this.getAllPresence());

      // User joins presence
      socket.on('user:presence:join', (data: { userId?: string; username?: string }) => {
        if (!data || (!data.username && !data.userId)) return;
        const username = (data.username || data.userId || 'usuario').toLowerCase();
        const userId = data.userId || username;

        this.socketToUser.set(socket.id, username);

        let userRecord = this.userPresence.get(username);
        if (!userRecord) {
          userRecord = {
            userId,
            username,
            status: 'ONLINE',
            lastSeen: new Date(),
            sockets: new Set<string>(),
          };
          this.userPresence.set(username, userRecord);
        } else {
          userRecord.status = 'ONLINE';
          userRecord.lastSeen = new Date();
        }

        userRecord.sockets.add(socket.id);

        const presencePayload: UserPresenceInfo = {
          userId: userRecord.userId,
          username: userRecord.username,
          status: userRecord.status,
          lastSeen: userRecord.lastSeen.toISOString(),
        };

        this.io?.emit('user:presence:update', presencePayload);
      });

      // User status heartbeat / update (e.g. ONLINE or AWAY)
      socket.on(
        'user:presence:heartbeat',
        (data: { userId?: string; username?: string; status?: UserPresenceStatus }) => {
          if (!data) return;
          const username = (data.username || data.userId || '').toLowerCase();
          if (!username) return;

          let userRecord = this.userPresence.get(username);
          if (userRecord) {
            userRecord.status = data.status || 'ONLINE';
            userRecord.lastSeen = new Date();
            userRecord.sockets.add(socket.id);

            const presencePayload: UserPresenceInfo = {
              userId: userRecord.userId,
              username: userRecord.username,
              status: userRecord.status,
              lastSeen: userRecord.lastSeen.toISOString(),
            };

            this.io?.emit('user:presence:update', presencePayload);
          }
        }
      );

      socket.on('disconnect', () => {
        logger.info(`Cliente desconectado: ${socket.id}`);
        const username = this.socketToUser.get(socket.id);
        this.socketToUser.delete(socket.id);

        if (username) {
          const userRecord = this.userPresence.get(username);
          if (userRecord) {
            userRecord.sockets.delete(socket.id);
            if (userRecord.sockets.size === 0) {
              userRecord.status = 'OFFLINE';
              userRecord.lastSeen = new Date();

              const presencePayload: UserPresenceInfo = {
                userId: userRecord.userId,
                username: userRecord.username,
                status: 'OFFLINE',
                lastSeen: userRecord.lastSeen.toISOString(),
              };

              this.io?.emit('user:presence:update', presencePayload);
            }
          }
        }
      });
    });
  }

  public getAllPresence(): Record<string, UserPresenceInfo> {
    const result: Record<string, UserPresenceInfo> = {};
    this.userPresence.forEach((val, key) => {
      result[key] = {
        userId: val.userId,
        username: val.username,
        status: val.status,
        lastSeen: val.lastSeen.toISOString(),
      };
    });
    return result;
  }

  public getIo(): Server {
    if (!this.io) {
      throw new Error('Socket.io no está inicializado');
    }
    return this.io;
  }
}

export const socketService = new SocketService();
