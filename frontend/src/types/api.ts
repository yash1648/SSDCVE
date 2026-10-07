import type { UserRole } from './auth';

export interface AdminUserResponse {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ApiErrorResponse {
  error?: string;
  message?: string;
  status?: number;
}
