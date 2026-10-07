export type UserRole = 'ADMIN' | 'ISSUER' | 'HOLDER' | 'VERIFIER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export type UserResponse = User;

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
}
