import { ITokenService, TokenPayload } from '../../application/ports/ITokenService';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '@config/env';

export class JwtTokenService implements ITokenService {
  public generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY as any,
    });
  }

  public verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      return decoded as TokenPayload;
    } catch (err) {
      return null;
    }
  }

  public generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }
}
