import { Request, Response } from 'express';
import { BaseController } from '@shared/infrastructure/BaseController';
import { GetAccessLogsUseCase } from '../../application/useCases/GetAccessLogsUseCase';

export class GetAccessLogsController extends BaseController {
  constructor(private getAccessLogsUseCase: GetAccessLogsUseCase) {
    super();
  }

  protected async executeImpl(req: Request, res: Response): Promise<any> {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const result = await this.getAccessLogsUseCase.execute({ limit });

    if (result.isFailure) {
      return this.fail(res, result.getError());
    }

    return this.ok(res, 'Logs de acceso recuperados exitosamente', result.getValue());
  }
}
