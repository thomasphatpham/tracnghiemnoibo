import { Role, UserStatus } from '@prisma/client';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  position?: string | null;
  role: Role;
  status: UserStatus;
  departmentId?: string | null;
  department?: { id: string; code: string; name: string } | null;
  permissions?: string[];
  sessionId?: string;
}
