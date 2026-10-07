export type VerificationStatus =
  | 'VALID'
  | 'TAMPERED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'NOT_FOUND'
  | 'UNAVAILABLE';

export interface DisclosureInfo {
  disclosed: number;
  total: number;
  complete: boolean;
}

export interface VerificationResult {
  valid: boolean;
  status: VerificationStatus;
  credentialNumber: string;
  reason: string;
  issuerId: string;
  issuerName: string;
  issuerDomain: string;
  issuerVerified: boolean;
  claims: Record<string, unknown>;
  issuedAt: string;
  expiresAt: string | null;
  verifiedAt: string;
  anchorTxHash: string | null;
  anchorBlockNumber: number | null;
  anchorChainId: number | null;
  anchorVerified: boolean;
  disclosure?: DisclosureInfo;
}

export interface VerificationChecks {
  envelopeStructure: boolean;
  schemaConformance: boolean;
  issuerSignature: boolean;
  onChainAnchor: boolean;
  revocationStatus: boolean;
  ipfsIntegrity: boolean;
}

export interface BatchItemResult {
  fileName: string;
  credentialNumber: string;
  recipientName: string;
  issuerName: string;
  status: VerificationStatus | string;
  valid: boolean;
  checks: VerificationChecks;
  verificationResult: VerificationResult;
  errorMessage: string;
}

export interface BatchVerificationResponse {
  batchId: string;
  total: number;
  processed: number;
  valid: number;
  tampered: number;
  revoked: number;
  expired: number;
  notFound: number;
  unavailable: number;
  failed: number;
  durationMs: number;
  results: BatchItemResult[];
}

export interface VerificationHistoryResponse {
  id: string;
  credentialId: string;
  credentialNumber: string;
  result: VerificationStatus;
  reason: string;
  verifiedAt: string;
}

export interface ChainStatus {
  chainId: number;
  latestBlock: number | null;
  anchoredCount: number;
}

export interface RecentAnchor {
  credentialNumber: string;
  issuerName: string;
  blockNumber: number | null;
  anchoredAt: string;
}

export interface AnchorLookup {
  credentialNumber: string;
  contentHash: string;
  txHash: string;
  blockNumber: number | null;
  chainId: number;
  anchorVerified: boolean;
}
