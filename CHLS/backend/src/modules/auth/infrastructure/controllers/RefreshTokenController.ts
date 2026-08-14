import { Request, Response } from 'express';
import { BaseController } from '@shared/infrastructure/BaseController';
import { RefreshTokenUseCase } from '../../application/useCases/RefreshTokenUseCase';
import { env } from '@config/env';

export class RefreshTokenController extends BaseController {
  constructor(private refreshTokenUseCase: RefreshTokenUseCase) {
    super();
  }

  protected async executeImpl(req: Request, res: Response): Promise<any> {
    // Manually parse the cookie to keep dependencies low
    const cookieHeader = req.headers.cookie || '';
    const refreshToken = cookieHeader
      .split(';')
      .find((c) => c.trim().startsWith('refreshToken='))
      ?.split('=')[1];

    if (!refreshToken) {
      return this.unauthorized(res, 'No se proporcionó token de actualización.');
    }

    const result = await this.refreshTokenUseCase.execute({ refreshToken });

    if (result.isFailure) {
      // Clear cookie on failure to prevent stale invalid cookie issues
      res.clearCookie('refreshToken');
      return this.forbidden(res, result.getError());
    }

    const { accessToken, refreshToken: newRefreshToken } = result.getValue();

    // Rotate refresh token in HttpOnly secure cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return this.ok(res, 'Token actualizado exitosamente', {
      accessToken,
    });
  }
}
