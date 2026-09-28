import { Request, Response } from 'express';
import { BaseController } from '@shared/infrastructure/BaseController';
import { RecordAccessAttemptUseCase } from '../../application/useCases/RecordAccessAttemptUseCase';

export class RecordAccessAttemptController extends BaseController {
  constructor(private recordAccessAttemptUseCase: RecordAccessAttemptUseCase) {
    super();
  }

  protected async executeImpl(req: Request, res: Response): Promise<any> {
    const { membershipNumber } = req.body;

    const result = await this.recordAccessAttemptUseCase.execute({ membershipNumber });

    if (result.isFailure) {
      return this.clientError(res, result.getError());
    }

    const data = result.getValue();

    return this.ok(
      res,
      data.allowed ? 'Acceso CONCEDIDO' : 'Acceso DENEGADO',
      data
    );
  }
}
