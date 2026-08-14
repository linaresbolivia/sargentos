export interface UserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  documentId?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt: Date;
  roles: { id: string; name: string }[];
}

export interface CreateUserDTO {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  documentId?: string;
  phone?: string;
  isActive?: boolean;
  roles: string[]; // names of roles
}

export interface UpdateUserRolesDTO {
  roles: string[]; // names of roles
}

export interface UpdateUserDTO {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  documentId?: string;
  phone?: string;
  roles?: string[];
  isActive?: boolean;
}
