import { Request, Response } from 'express';
import { BaseController } from '@shared/infrastructure/BaseController';
import { LoginUseCase } from '../../application/useCases/LoginUseCase';
import { env } from '@config/env';

export class LoginController extends BaseController {
  constructor(private loginUseCase: LoginUseCase) {
    super();
  }

  protected async executeImpl(req: Request, res: Response): Promise<any> {
    const { email, password } = req.body;

    const result = await this.loginUseCase.execute({ email, password });

    if (result.isFailure) {
      return this.clientError(res, result.getError());
    }

    const { user, accessToken, refreshToken } = result.getValue();

    // Set refresh token in HttpOnly secure cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return this.ok(res, 'Sesión iniciada exitosamente', {
      user,
      accessToken,
    });
  }
}
