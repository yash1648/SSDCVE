export interface WalletCredential {
  credentialId: string;
  credentialNumber: string;
  type: string;
  title: string;
  issuerId: string;
  issuerName: string;
  issuerDomain: string;
  anchorTxHash: string | null;
  anchorBlockNumber: number | null;
  anchorChainId: number | null;
  issuedAt: string;
  expiresAt: string | null;
  status: 'ACTIVE' | 'REVOKED';
}

export interface DisclosureData {
  claims: Record<string, unknown>;
  hiddenClaims: string[];
}

export interface DisclosureUpdateRequest {
  hiddenClaims: string[];
}
