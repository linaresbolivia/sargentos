import { IHashService } from '../../application/ports/IHashService';
import argon2 from 'argon2';

export class Argon2HashService implements IHashService {
  public async hash(value: string): Promise<string> {
    return argon2.hash(value);
  }

  public async compare(value: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, value);
    } catch (err) {
      return false;
    }
  }
}
