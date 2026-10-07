// Contract check: hand-written UI types must carry exactly the keys the
// OpenAPI spec sends. Regenerate with `npm run gen:api`, then `tsc` fails
// here, not at some distant render, when the contract drifts.
// UI types stay required/non-null where the API guarantees values; the
// generated schema leaves everything optional (spec has no `required`).

import type { components } from "./schema";
import type {
  BatchItemResult,
  BatchVerificationResponse,
  VerificationChecks,
  VerificationHistoryResponse,
  VerificationResult,
  ChainStatus,
  RecentAnchor,
  AnchorLookup,
} from "../types/verifier";
import type {
  IssuerProfile,
  IssuerRegisterPayload,
  IssuerKey,
  HolderLookupResponse,
  CredentialIssuePayload,
  IssuerCredential,
  RevokeResponse,
  IssuerVerificationRecord,
} from "../types/issuer";
import type {
  WalletCredential,
  DisclosureData,
  DisclosureUpdateRequest,
} from "../types/holder";
import type {
  AdminIssuerResponse,
  AdminUserResponse,
  AdminVerificationResponse,
} from "../types/admin";
import type { AuthResponse, User } from "../types/auth";

type Schemas = components["schemas"];

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <
  T,
>() => T extends B ? 1 : 2
  ? true
  : false;

type Assert<T extends true> = T;
type Keys<T> = keyof T;

// Verifier
type Checks = [
  Assert<Equal<Keys<VerificationResult>, Keys<Schemas["VerificationResult"]>>>,
  Assert<Equal<Keys<BatchItemResult>, Keys<Schemas["BatchItemResult"]>>>,
  Assert<Equal<Keys<BatchVerificationResponse>, Keys<Schemas["BatchVerificationResponse"]>>>,
  Assert<Equal<Keys<VerificationChecks>, Keys<Schemas["VerificationChecks"]>>>,
  Assert<Equal<Keys<VerificationHistoryResponse>, Keys<Schemas["VerificationHistoryResponse"]>>>,
  Assert<Equal<Keys<ChainStatus>, Keys<Schemas["ChainStatusResponse"]>>>,
  Assert<Equal<Keys<RecentAnchor>, Keys<Schemas["RecentAnchorResponse"]>>>,
  Assert<Equal<Keys<AnchorLookup>, Keys<Schemas["AnchorLookupResponse"]>>>,
  // Issuer
  Assert<Equal<Keys<IssuerProfile>, Keys<Schemas["IssuerResponse"]>>>,
  Assert<Equal<Keys<IssuerRegisterPayload>, Keys<Schemas["IssuerRegisterRequest"]>>>,
  Assert<Equal<Keys<IssuerKey>, Keys<Schemas["IssuerKeyResponse"]>>>,
  Assert<Equal<Keys<HolderLookupResponse>, Keys<Schemas["UserResponse"]>>>,
  Assert<Equal<Keys<CredentialIssuePayload>, Keys<Schemas["CredentialIssueRequest"]>>>,
  Assert<Equal<Keys<IssuerCredential>, Keys<Schemas["CredentialResponse"]>>>,
  Assert<Equal<Keys<RevokeResponse>, Keys<Schemas["RevokeResponse"]>>>,
  Assert<Equal<Keys<IssuerVerificationRecord>, Keys<Schemas["VerificationRecordResponse"]>>>,
  // Holder
  Assert<Equal<Keys<WalletCredential>, Keys<Schemas["WalletCredentialResponse"]>>>,
  Assert<Equal<Keys<DisclosureData>, Keys<Schemas["DisclosureResponse"]>>>,
  Assert<Equal<Keys<DisclosureUpdateRequest>, Keys<Schemas["DisclosureUpdateRequest"]>>>,
  // Admin
  Assert<Equal<Keys<AdminIssuerResponse>, Keys<Schemas["AdminIssuerResponse"]>>>,
  Assert<Equal<Keys<AdminUserResponse>, Keys<Schemas["AdminUserResponse"]>>>,
  Assert<Equal<Keys<AdminVerificationResponse>, Keys<Schemas["AdminVerificationResponse"]>>>,
  // Auth
  Assert<Equal<Keys<AuthResponse>, Keys<Schemas["AuthResponse"]>>>,
  Assert<Equal<Keys<User>, Keys<Schemas["UserResponse"]>>>,
];

export type { Checks };
