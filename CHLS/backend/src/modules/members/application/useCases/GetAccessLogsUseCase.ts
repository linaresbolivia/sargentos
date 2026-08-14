import { IAccessLogRepository } from '../../domain/IAccessLogRepository';
import { AccessLogDto } from '../dtos/MemberDto';
import { Result } from '@shared/domain/Result';

interface GetAccessLogsInput {
  limit?: number;
}

export class GetAccessLogsUseCase {
  constructor(private accessLogRepository: IAccessLogRepository) {}

  public async execute(input: GetAccessLogsInput): Promise<Result<AccessLogDto[]>> {
    const limit = input.limit || 50;

    const rawLogs = await this.accessLogRepository.getRecentLogs(limit);

    const logs: AccessLogDto[] = rawLogs.map((log) => ({
      id: log.id,
      memberProfileId: log.memberProfileId,
      memberName: `${log.memberProfile.firstName} ${log.memberProfile.lastName}`,
      membershipNumber: log.memberProfile.membershipNumber,
      timestamp: log.timestamp.toISOString(),
      status: log.status,
      reason: log.reason,
    }));

    return Result.ok<AccessLogDto[]>(logs);
  }
}
