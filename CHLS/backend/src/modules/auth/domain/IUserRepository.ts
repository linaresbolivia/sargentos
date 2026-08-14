import { User } from './User';

export interface IUserRepository {
  exists(email: string): Promise<boolean>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
  findRoleByName(name: string): Promise<any | null>; // Returns role details
}
