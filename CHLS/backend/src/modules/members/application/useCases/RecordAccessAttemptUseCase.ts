import { IMemberRepository } from '../../domain/IMemberRepository';
import { IAccessLogRepository } from '../../domain/IAccessLogRepository';
import { AccessLog } from '../../domain/AccessLog';
import { AccessCheckResponseDto } from '../dtos/MemberDto';
import { MemberMap } from '../mappers/MemberMap';
import { Result } from '@shared/domain/Result';

interface RecordAccessAttemptInput {
  membershipNumber: string;
}

export class RecordAccessAttemptUseCase {
  constructor(
    private memberRepository: IMemberRepository,
    private accessLogRepository: IAccessLogRepository
  ) {}

  public async execute(input: RecordAccessAttemptInput): Promise<Result<AccessCheckResponseDto>> {
    if (!input.membershipNumber) {
      return Result.fail<AccessCheckResponseDto>('El número de membresía es requerido.');
    }

    // 1. Fetch member profile
    const member = await this.memberRepository.findByMembershipNumber(input.membershipNumber);
    if (!member) {
      return Result.fail<AccessCheckResponseDto>('Número de membresía inválido. Socio no encontrado.');
    }

    // 2. Business Logic: Deny access if they have active debts
    const hasDebt = member.hasDebt();
    const status = hasDebt ? 'DENIED' : 'GRANTED';
    const reason = hasDebt 
      ? `Deuda Pendiente: $${Number(member.totalDebt).toLocaleString()}`
      : 'Sin deuda pendiente. Acceso permitido.';

    // 3. Create AccessLog domain entity
    const logResult = AccessLog.create({
      memberProfileId: member.id,
      status,
      reason,
    });

    if (logResult.isFailure) {
      return Result.fail<AccessCheckResponseDto>(logResult.getError());
    }

    const log = logResult.getValue();

    // 4. Save to Repository
    await this.accessLogRepository.save(log);

    // 5. Build DTO and return
    const memberDto = MemberMap.toDTO(member);
    const logDto = {
      id: log.id,
      memberProfileId: log.memberProfileId,
      memberName: member.fullName,
      membershipNumber: member.membershipNumber,
      timestamp: log.timestamp.toISOString(),
      status: log.status,
      reason: log.reason || null,
    };

    return Result.ok<AccessCheckResponseDto>({
      allowed: !hasDebt,
      member: memberDto,
      log: logDto,
    });
  }
}
