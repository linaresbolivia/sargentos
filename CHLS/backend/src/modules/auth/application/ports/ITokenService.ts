export interface TokenPayload {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface AccessTokenResponse {
  accessToken: string;
  expiresIn: string; // Expiry in human readable form (e.g. "15m")
}

export interface ITokenService {
  generateAccessToken(payload: TokenPayload): string;
  verifyAccessToken(token: string): TokenPayload | null;
  generateRefreshToken(): string;
}
