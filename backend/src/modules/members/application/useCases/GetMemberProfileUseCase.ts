import { IMemberRepository } from '../../domain/IMemberRepository';
import { MemberProfileDto } from '../dtos/MemberDto';
import { MemberMap } from '../mappers/MemberMap';
import { Result } from '@shared/domain/Result';

interface GetMemberProfileInput {
  userId: string;
}

export class GetMemberProfileUseCase {
  constructor(private memberRepository: IMemberRepository) {}

  public async execute(input: GetMemberProfileInput): Promise<Result<MemberProfileDto>> {
    if (!input.userId) {
      return Result.fail<MemberProfileDto>('El userId es requerido.');
    }

    const member = await this.memberRepository.findByUserId(input.userId);
    
    if (!member) {
      return Result.fail<MemberProfileDto>('No se encontró el perfil de socio asociado a este usuario.');
    }

    return Result.ok<MemberProfileDto>(MemberMap.toDTO(member));
  }
}
