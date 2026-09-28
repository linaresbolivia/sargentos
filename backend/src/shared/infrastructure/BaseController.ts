import { Response } from 'express';
import { logger } from '@config/logger';

export abstract class BaseController {
  protected abstract executeImpl(req: any, res: Response): Promise<void | any>;

  public async execute(req: any, res: Response): Promise<void> {
    try {
      await this.executeImpl(req, res);
    } catch (err) {
      logger.error(`[BaseController] Uncaught controller error:`, err);
      this.fail(res, 'Ocurrió un error inesperado en el servidor.');
    }
  }

  public jsonResponse(res: Response, code: number, message: string, data?: any) {
    return res.status(code).json({
      success: code >= 200 && code < 300,
      message,
      data,
    });
  }

  public ok<T>(res: Response, message: string = 'Operación exitosa', data?: T) {
    return this.jsonResponse(res, 200, message, data);
  }

  public created<T>(res: Response, message: string = 'Creado correctamente', data?: T) {
    return this.jsonResponse(res, 201, message, data);
  }

  public clientError(res: Response, message: string = 'Solicitud incorrecta') {
    return this.jsonResponse(res, 400, message);
  }

  public unauthorized(res: Response, message: string = 'No autorizado') {
    return this.jsonResponse(res, 401, message);
  }

  public forbidden(res: Response, message: string = 'Acceso denegado') {
    return this.jsonResponse(res, 403, message);
  }

  public notFound(res: Response, message: string = 'Recurso no encontrado') {
    return this.jsonResponse(res, 404, message);
  }

  public fail(res: Response, error: Error | string) {
    const message = error instanceof Error ? error.message : error;
    return this.jsonResponse(res, 500, message);
  }
}
