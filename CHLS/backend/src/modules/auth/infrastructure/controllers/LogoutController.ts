import { Request, Response } from 'express';
import { BaseController } from '@shared/infrastructure/BaseController';
import { LogoutUseCase } from '../../application/useCases/LogoutUseCase';

export class LogoutController extends BaseController {
  constructor(private logoutUseCase: LogoutUseCase) {
    super();
  }

  protected async executeImpl(req: Request, res: Response): Promise<any> {
    const cookieHeader = req.headers.cookie || '';
    const refreshToken = cookieHeader
      .split(';')
      .find((c) => c.trim().startsWith('refreshToken='))
      ?.split('=')[1];

    if (refreshToken) {
      await this.logoutUseCase.execute({ refreshToken });
    }

    // Always clear the cookie regardless of if the token was found/valid
    res.clearCookie('refreshToken');

    return this.ok(res, 'Sesión cerrada exitosamente');
  }
}
