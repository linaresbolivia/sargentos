import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from './env';
import { logger } from './logger';

class SocketService {
  private io: Server | null = null;

  public init(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: (env as any).CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
      },
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info(`Cliente conectado vía WebSocket: ${socket.id}`);

      socket.on('disconnect', () => {
        logger.info(`Cliente desconectado: ${socket.id}`);
      });
    });
  }

  public getIo(): Server {
    if (!this.io) {
      throw new Error('Socket.io no está inicializado');
    }
    return this.io;
  }
}

export const socketService = new SocketService();
