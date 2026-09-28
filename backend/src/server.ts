import { app } from './app';
import { env } from '@config/env';
import { logger } from '@config/logger';
import { socketService } from '@config/socket';
import { whatsappManager } from '@modules/whatsapp/infrastructure/whatsappService';

// Prevent WhatsApp LocalAuth logout & Puppeteer background operations from crashing the server on Windows
process.on('uncaughtException', (err: any) => {
  const errMsg = String(err?.message || err || '');
  const errStack = String(err?.stack || '');
  const errCode = String(err?.code || '');

  const isNonFatal =
    errCode === 'EBUSY' ||
    errCode === 'EPERM' ||
    errMsg.includes('.wwebjs_auth') ||
    errStack.includes('.wwebjs_auth') ||
    errMsg.includes('detached Frame') ||
    errMsg.includes('Session closed') ||
    errMsg.includes('Target closed') ||
    errMsg.includes('Protocol error') ||
    errMsg.includes('Execution context was destroyed') ||
    errMsg.includes('Evaluation failed') ||
    errMsg.includes('userDataDir') ||
    errMsg.includes('chrome') ||
    errMsg.includes('puppeteer');

  if (isNonFatal) {
    logger.warn('Ignored non-fatal background error: ' + errMsg);
  } else {
    logger.error('Uncaught Exception:', err);
  }
});

process.on('unhandledRejection', (reason: any) => {
  logger.warn('Unhandled Rejection: ' + (reason?.message || reason));
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
