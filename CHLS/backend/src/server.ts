import { app } from './app';
import { env } from '@config/env';
import { logger } from '@config/logger';
import { socketService } from '@config/socket';
import { whatsappManager } from '@modules/whatsapp/infrastructure/whatsappService';

// Prevent WhatsApp LocalAuth logout from crashing the server on Windows (EBUSY error)
process.on('uncaughtException', (err: any) => {
  if (err && err.code === 'EBUSY' && err.message.includes('.wwebjs_auth')) {
    logger.warn('Ignored EBUSY error during WhatsApp session cleanup: ' + err.message);
  } else if (err && err.message && err.message.includes('detached Frame')) {
    logger.warn('Ignored Puppeteer detached Frame error during WhatsApp logout: ' + err.message);
  } else if (err && err.message && err.message.includes('Session closed')) {
    logger.warn('Ignored Puppeteer Session closed error: ' + err.message);
  } else {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
  }
});

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Servidor ejecutándose en http://localhost:${env.PORT}`);
});

// Inicializar Socket.io con el servidor HTTP
socketService.init(server);


// Handle graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Recibiendo señal de apagado. Cerrando cliente WhatsApp...');
  try {
    await whatsappManager.destroyAll();
  } catch (e) {
    logger.error('Error cerrando WhatsApp', e);
  }
  
  logger.info('Cerrando servidor de forma limpia...');
  server.close(() => {
    logger.info('Servidor HTTP cerrado.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
// Manejar cierre al reiniciar con nodemon/ts-node-dev
process.on('SIGUSR2', async () => {
  await whatsappManager.destroyAll();
  process.exit(0);
});
