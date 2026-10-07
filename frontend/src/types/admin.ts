export interface AdminIssuerResponse {
  id: string;
  userId: string;
  name: string;
  domain: string;
  verified: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface AdminUserResponse {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'ISSUER' | 'HOLDER' | 'VERIFIER';
  createdAt: string;
  updatedAt?: string | null;
}

export interface AdminVerificationResponse {
  id: string;
  credentialId: string | null;
  credentialNumber: string | null;
  verifierId: string | null;
  result: 'VALID' | 'TAMPERED' | 'REVOKED' | 'EXPIRED' | 'NOT_FOUND' | 'UNAVAILABLE';
  reason?: string | null;
  verifiedAt: string;
}
