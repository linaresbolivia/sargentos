export interface PqrsTicket {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string;
  memberCode?: string | null;
  type: string;
  area?: string | null;
  applicantCondition: string;
  description: string;
  status: string;
  resolution?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
