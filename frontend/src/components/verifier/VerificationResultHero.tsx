import React from 'react';
import { Check, X, BadgeCheck, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { ResultSeal } from './ResultSeal';
import { GlossaryTerm } from './GlossaryTerm';
import { HashDisplay } from '../common/HashDisplay';
import type { VerificationResult, VerificationChecks } from '../../types';

interface VerificationResultHeroProps {
  result: VerificationResult;
  checks?: VerificationChecks;
  onReset?: () => void;
  resetLabel?: string;
}

const CHECK_LABELS: { key: keyof VerificationChecks; label: string }[] = [
  { key: 'envelopeStructure', label: 'Complete file' },
  { key: 'schemaConformance', label: 'Required details present' },
  { key: 'issuerSignature', label: 'Issuer signature' },
  { key: 'onChainAnchor', label: 'Independent record' },
  { key: 'revocationStatus', label: 'Not withdrawn' },
  { key: 'ipfsIntegrity', label: 'Stored copy intact' },
];

const formatUtc = (value: string | null | undefined): string => {
  if (!value) return 'Not recorded';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Not recorded';
  return `${d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')} UTC`;
};

export const VerificationResultHero: React.FC<VerificationResultHeroProps> = ({
  result,
  checks,
  onReset,
  resetLabel = 'Check another',
}) => {
  const evaluated: VerificationChecks = checks ?? {
    envelopeStructure: result.status !== 'TAMPERED' || !result.reason.toLowerCase().includes('structure'),
    schemaConformance: result.status !== 'TAMPERED' || !result.reason.toLowerCase().includes('schema'),
    issuerSignature: result.status !== 'TAMPERED' && result.status !== 'NOT_FOUND',
    onChainAnchor: result.anchorVerified || result.status === 'VALID',
    revocationStatus: result.status !== 'REVOKED',
    ipfsIntegrity: result.status !== 'TAMPERED' || !result.reason.toLowerCase().includes('ipfs'),
  };

  const failed = result.status !== 'VALID';
  const contentHash =
    typeof result.claims?.contentHash === 'string' ? result.claims.contentHash : null;
  const claimsList = result.claims ? Object.entries(result.claims) : [];

  return (
    <div className="space-y-6">
      <div role={failed ? 'alert' : undefined}>
        <ResultSeal status={result.status} reason={result.reason} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Credential number</dt>
            <dd className="font-mono tabular-nums font-semibold text-foreground">
              {result.credentialNumber || 'Not recorded'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Checked at</dt>
            <dd className="tabular-nums text-foreground">{formatUtc(result.verifiedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Issued by</dt>
            <dd className="flex flex-wrap items-center gap-2 text-foreground">
              <span className="font-semibold">{result.issuerName || 'Unknown issuer'}</span>
              {result.issuerVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <BadgeCheck className="h-4 w-4" aria-hidden />
                  Verified issuer
                </span>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">Unverified issuer</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Valid period</dt>
            <dd className="tabular-nums text-foreground">
              {formatUtc(result.issuedAt)}
              {result.expiresAt ? ` to ${formatUtc(result.expiresAt)}` : ', no expiry'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              <GlossaryTerm term="txHash">Record reference</GlossaryTerm>
            </dt>
            <dd>
              <HashDisplay value={result.anchorTxHash} truncateLength={8} />
            </dd>
          </div>
          {contentHash && (
            <div>
              <dt className="text-xs text-muted-foreground">
                <GlossaryTerm term="contentHash">Content fingerprint</GlossaryTerm>
              </dt>
              <dd>
                <HashDisplay value={contentHash} truncateLength={8} />
              </dd>
            </div>
          )}
        </dl>
        {onReset && (
          <div className="pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
              className="gap-1.5 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              {resetLabel}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h3 className="text-sm font-bold text-foreground">Security checks</h3>
        <p className="text-xs text-muted-foreground">
          Each check explained in plain words. Hover an underlined name for its meaning.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {CHECK_LABELS.map(({ key, label }) => {
            const passed = evaluated[key];
            return (
              <li
                key={key}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5"
              >
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${
                    passed ? 'bg-primary' : 'bg-destructive'
                  }`}
                >
                  {passed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </span>
                <GlossaryTerm term={key}>
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                </GlossaryTerm>
                <span className="sr-only">{passed ? 'passed' : 'failed'}</span>
                <span aria-hidden className="ml-auto text-xs font-medium text-muted-foreground">
                  {passed ? 'Pass' : 'Fail'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h3 className="text-sm font-bold text-foreground">Details shared by the holder</h3>
        {result.disclosure && (
          <p className="text-xs tabular-nums text-muted-foreground">
            {result.disclosure.disclosed} of {result.disclosure.total} fields shared
            {!result.disclosure.complete && ', some fields were kept private'}
          </p>
        )}
        {claimsList.length === 0 ? (
          <p className="pt-2 text-sm text-muted-foreground">No details were shared.</p>
        ) : (
          <dl className="mt-3 divide-y divide-border rounded-lg border border-border">
            {claimsList.map(([key, val]) => (
              <div key={key} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
                <dt className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                  {key}
                </dt>
                <dd className="break-all text-right font-medium text-foreground">{String(val)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
};
