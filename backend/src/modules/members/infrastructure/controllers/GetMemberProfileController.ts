import { Request, Response } from 'express';
import { BaseController } from '@shared/infrastructure/BaseController';
import { GetMemberProfileUseCase } from '../../application/useCases/GetMemberProfileUseCase';

export class GetMemberProfileController extends BaseController {
  constructor(private getMemberProfileUseCase: GetMemberProfileUseCase) {
    super();
  }

  protected async executeImpl(req: Request, res: Response): Promise<any> {
    const userId = req.user?.userId;

    if (!userId) {
      return this.unauthorized(res, 'No autorizado.');
    }

    const result = await this.getMemberProfileUseCase.execute({ userId });

    if (result.isFailure) {
      return this.notFound(res, result.getError());
    }

    return this.ok(res, 'Perfil del socio cargado exitosamente', result.getValue());
  }
}
