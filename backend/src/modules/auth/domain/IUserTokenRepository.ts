import { UserToken } from './UserToken';

export interface IUserTokenRepository {
  findByToken(token: string): Promise<UserToken | null>;
  save(userToken: UserToken): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
}
