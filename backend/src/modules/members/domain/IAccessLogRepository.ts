import { AccessLog } from './AccessLog';

export interface IAccessLogRepository {
  save(accessLog: AccessLog): Promise<void>;
  getRecentLogs(limit: number): Promise<any[]>; // Returns log history combined with member names
}
