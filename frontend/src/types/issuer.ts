import type { UserRole } from './auth';

export interface IssuerProfile {
  id: string;
  name: string;
  domain: string;
  verified: boolean;
  createdAt: string;
}

export interface IssuerRegisterPayload {
  name: string;
  domain: string;
}

export interface IssuerKey {
  keyId: string;
  publicKey: string;
  algorithm: string;
  active: boolean;
  createdAt: string;
  revokedAt?: string | null;
}

export interface HolderLookupResponse {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface CredentialIssuePayload {
  subjectId: string;
  type: string;
  title: string;
  claims: Record<string, unknown>;
}

export interface IssuerCredential {
  id: string;
  credentialNumber: string;
  type: string;
  title: string;
  subjectId: string;
  subjectName: string;
  contentHash: string;
  ipfsCid: string | null;
  documentCid: string | null;
  anchorTxHash: string | null;
  anchorBlockNumber: number | null;
  anchorChainId: number | null;
  signature: string;
  signatureAlgorithm: string;
  keyId: string;
  issuedAt: string;
  expiresAt: string | null;
  status: 'ACTIVE' | 'REVOKED';
}

export interface RevokePayload {
  reason?: string;
}

export interface RevokeResponse {
  credentialId: string;
  credentialNumber: string;
  status: 'REVOKED' | 'ACTIVE';
  revokedAt: string;
  reason?: string;
}

export interface IssuerVerificationRecord {
  credentialNumber: string;
  status: 'ACTIVE' | 'REVOKED';
  reason?: string;
  revokedAt?: string | null;
  issuedAt: string;
  expiresAt?: string | null;
}
