import { Request, Response, NextFunction } from 'express';
import { logger } from '@config/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error(`[Express Error Handler] Unhandled error:`, err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Error inesperado del servidor';

  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Ocurrió un error en el servidor.' : message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
