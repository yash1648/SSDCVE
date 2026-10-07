import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import {
  Search,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  FileCheck2,
  Upload,
  Layers,
  Loader2,
  AlertCircle,
  Copy,
  Link2,
  Check,
} from 'lucide-react';
import { issuerApi } from '../../lib/api';
import type { HolderLookupResponse, IssuerCredential } from '../../types';

interface ClaimRow {
  id: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'date';
}

interface IssueCredentialWizardProps {
  onSuccess: (credential: IssuerCredential) => void;
  onAttachDocument?: (credentialId: string) => void;
}

const ResultSealValid: React.FC<{ credentialNumber: string; blockNumber: number | null }> = ({
  credentialNumber,
  blockNumber,
}) => (
  <div className="rounded-xl border-2 border-accent/40 bg-accent/5 p-6 text-center space-y-2">
    <div className="flex justify-center">
      <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
        <CheckCircle2 className="w-7 h-7 text-accent" />
      </div>
    </div>
    <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
      Credential Issued
    </h2>
    <p className="text-sm text-muted-foreground">
      Digitally signed and anchored on block {blockNumber ?? 'pending'}
    </p>
    <p className="text-sm font-mono tabular-nums text-accent font-semibold">
      {credentialNumber}
    </p>
  </div>
);

export const IssueCredentialWizard: React.FC<IssueCredentialWizardProps> = ({
  onSuccess,
  onAttachDocument,
}) => {
  // Step 1: Find holder
  const [searchEmail, setSearchEmail] = useState('');
  const [searchingHolder, setSearchingHolder] = useState(false);
  const [selectedHolder, setSelectedHolder] = useState<HolderLookupResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Step 2: Credential Details
  const [credType, setCredType] = useState('DegreeCertificate');
  const [credTitle, setCredTitle] = useState('');

  // Step 3: Dynamic Claims
  const [claims, setClaims] = useState<ClaimRow[]>([
    { id: '1', key: 'cgpa', value: '3.92', type: 'number' },
    { id: '2', key: 'major', value: 'Computer Science', type: 'string' },
    { id: '3', key: 'honors', value: 'true', type: 'boolean' },
    { id: '4', key: 'graduationDate', value: '2026-05-15', type: 'date' },
  ]);

  // Submission & Success
  const [isIssuing, setIsIssuing] = useState(false);
  const [issuedResult, setIssuedResult] = useState<IssuerCredential | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'id' | 'wallet' | null>(null);

  // Search holder
  const handleSearchHolder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchEmail.trim()) return;
    setSearchingHolder(true);
    setSearchError(null);
    try {
      const res = await issuerApi.lookupHolders(searchEmail.trim());
      const holder = Array.isArray(res) ? res[0] : res;
      if (holder && holder.id && holder.email) {
        setSelectedHolder(holder);
      } else {
        setSelectedHolder(null);
        setSearchError('No registered recipient found for exact email. Ensure student has registered first.');
      }
    } catch {
      setSelectedHolder(null);
      setSearchError('No registered recipient found for exact email. Ensure student has registered first.');
    } finally {
      setSearchingHolder(false);
    }
  };

  // Convert claims to raw object
  const buildClaimsObject = () => {
    const obj: Record<string, unknown> = {};
    claims.forEach((c) => {
      if (!c.key.trim()) return;
      if (c.type === 'number') {
        const num = Number(c.value);
        obj[c.key] = isNaN(num) ? c.value : num;
      } else if (c.type === 'boolean') {
        obj[c.key] = c.value === 'true';
      } else {
        obj[c.key] = c.value;
      }
    });
    return obj;
  };

  const handleAddClaim = () => {
    setClaims((prev) => [
      ...prev,
      { id: String(Date.now()), key: '', value: '', type: 'string' },
    ]);
  };

  const handleRemoveClaim = (id: string) => {
    setClaims((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateClaim = (id: string, field: keyof ClaimRow, val: string) => {
    setClaims((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: val } : c))
    );
  };

  // Issue Credential
  const handleIssue = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedHolder) {
      setIssueError('Please lookup and verify student recipient first.');
      return;
    }
    if (!credTitle.trim()) {
      setIssueError('Please specify an official credential title.');
      return;
    }

    setIsIssuing(true);
    setIssueError(null);
    try {
      const payload = {
        subjectId: selectedHolder.id,
        type: credType.trim() || 'DegreeCertificate',
        title: credTitle.trim(),
        claims: buildClaimsObject(),
      };

      const result = await issuerApi.issueCredential(payload);
      setIssuedResult(result);
      onSuccess(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to issue credential. Check inputs and key validity.';
      setIssueError(message);
    } finally {
      setIsIssuing(false);
    }
  };

  const handleCopy = async (text: string, type: 'id' | 'wallet') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(type);
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      // Ignore copy errors
    }
  };

  const handleIssueAnother = () => {
    setIssuedResult(null);
    setSelectedHolder(null);
    setCredTitle('');
    setSearchEmail('');
    setSearchError(null);
    setIssueError(null);
    setClaims([
      { id: '1', key: 'cgpa', value: '3.92', type: 'number' },
      { id: '2', key: 'major', value: 'Computer Science', type: 'string' },
      { id: '3', key: 'honors', value: 'true', type: 'boolean' },
      { id: '4', key: 'graduationDate', value: '2026-05-15', type: 'date' },
    ]);
  };

  // If already successfully issued
  if (issuedResult) {
    const walletLink = `/holder?add=${issuedResult.id}`;
    return (
      <Card className="border-accent/30 dark:border-accent/20 bg-card shadow-lg">
        <CardHeader className="text-center pb-4">
          <ResultSealValid
            credentialNumber={issuedResult.credentialNumber}
            blockNumber={issuedResult.anchorBlockNumber}
          />
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 p-4 bg-muted/40 rounded-xl border border-border text-xs">
            <div>
              <span className="text-muted-foreground block">Credential Number:</span>
              <strong className="text-sm font-mono tabular-nums text-foreground">
                {issuedResult.credentialNumber}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Graduate:</span>
              <strong className="text-sm text-foreground">
                {issuedResult.subjectName}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Ledger record:</span>
              <span className="font-mono tabular-nums text-foreground font-semibold">
                Block #{issuedResult.anchorBlockNumber ?? '-'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Issued:</span>
              <span className="font-mono text-xs text-foreground">
                {new Date(issuedResult.issuedAt).toISOString().replace('T', ' ').replace('Z', ' UTC')}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onAttachDocument && (
              <Button
                variant="outline"
                onClick={() => onAttachDocument(issuedResult.id)}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Attach Supporting Document
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => handleCopy(issuedResult.id, 'id')}
              className="gap-2"
              aria-label={copyStatus === 'id' ? 'Copied' : 'Copy credential ID to clipboard'}
            >
              {copyStatus === 'id' ? (
                <Check className="w-4 h-4 text-accent" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copyStatus === 'id' ? 'Copied' : 'Copy ID'}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCopy(walletLink, 'wallet')}
              className="gap-2"
              aria-label={copyStatus === 'wallet' ? 'Copied' : 'Copy wallet link to clipboard'}
            >
              {copyStatus === 'wallet' ? (
                <Check className="w-4 h-4 text-accent" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {copyStatus === 'wallet' ? 'Copied' : 'Share wallet link'}
            </Button>
            <Button
              onClick={handleIssueAnother}
              className="gap-2 font-semibold bg-primary hover:bg-primary/90"
            >
              <FileCheck2 className="w-4 h-4" />
              Issue Another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-md">
      <CardHeader className="border-b border-border/80 pb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Issue a certificate</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Issue a secure certificate, signed by your institution and independently recorded.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Recipient Student Email Lookup */}
        <div className="space-y-4 rounded-xl border border-border p-4 bg-muted/20">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Find the graduate
            </h3>
            <p className="text-xs text-muted-foreground">
              Search for the graduate's account by email address.
            </p>
          </div>

          <form onSubmit={handleSearchHolder} className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="email"
                placeholder="graduate@university.edu (graduate's email)"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <Button
              type="submit"
              disabled={searchingHolder || !searchEmail.trim()}
              className="gap-2 shrink-0 font-semibold"
            >
              {searchingHolder ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Lookup Student
            </Button>
          </form>

          {searchError && (
            <Alert variant="destructive" className="text-xs">
              <AlertTitle className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Holder Not Found</span>
              </AlertTitle>
              <AlertDescription>{searchError}</AlertDescription>
            </Alert>
          )}

          {selectedHolder && (
            <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary dark:text-primary flex items-center justify-center font-bold text-sm">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {selectedHolder.fullName}
                  </h4>
                  <p className="text-xs font-mono text-muted-foreground">
                    {selectedHolder.email}
                  </p>
                  <span className="text-[10px] text-muted-foreground font-mono block">
                    ID: {selectedHolder.id}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="text-xs text-primary border-primary/30">
                Verified Recipient
              </Badge>
            </div>
          )}
        </div>

        {/* Credential Details Form */}
        <div className="space-y-4 rounded-xl border border-border p-4 bg-card">
          <h3 className="text-sm font-bold text-foreground">
            Credential Metadata & Title
          </h3>

          <div className="space-y-1.5">
            <Label htmlFor="credType">Credential Type *</Label>
            <Input
              id="credType"
              placeholder="DegreeCertificate, Diploma, Transcript"
              value={credType}
              onChange={(e) => setCredType(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="credTitle">Official Credential Title *</Label>
            <Input
              id="credTitle"
              placeholder="e.g. Bachelor of Science in Cybersecurity"
              value={credTitle}
              onChange={(e) => setCredTitle(e.target.value)}
            />
          </div>
        </div>

        {/* Dynamic Claims Editor */}
        <div className="space-y-4 rounded-xl border border-border p-4 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Certificate details
              </h3>
              <p className="text-xs text-muted-foreground">
                Extra details to include on the certificate, e.g. major or graduation year.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddClaim}
              className="gap-1.5 text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5" /> Add Claim
            </Button>
          </div>

          <div className="space-y-2.5">
            {claims.map((claim) => (
              <div key={claim.id} className="flex items-center gap-2">
                <Input
                  placeholder="Key (e.g. major, cgpa)"
                  value={claim.key}
                  onChange={(e) => handleUpdateClaim(claim.id, 'key', e.target.value)}
                  className="w-1/3 text-xs"
                />
                <select
                  value={claim.type}
                  onChange={(e) =>
                    handleUpdateClaim(claim.id, 'type', e.target.value as any)
                  }
                  className="h-9 text-xs bg-background border border-border rounded-md px-2 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="date">Date</option>
                </select>
                <Input
                  placeholder="Value"
                  value={claim.value}
                  onChange={(e) => handleUpdateClaim(claim.id, 'value', e.target.value)}
                  className="flex-1 text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveClaim(claim.id)}
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Canonical Claims JSON Preview */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Live Canonical Claims JSON:
            </label>
            <pre className="p-3 bg-muted/60 border border-border rounded-xl text-xs font-mono overflow-x-auto text-foreground max-h-36">
              {JSON.stringify(buildClaimsObject(), null, 2)}
            </pre>
          </div>
        </div>

        {/* Error Display */}
        {issueError && (
          <Alert variant="destructive" className="text-xs">
            <AlertTitle className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Issue Failed</span>
            </AlertTitle>
            <AlertDescription>{issueError}</AlertDescription>
          </Alert>
        )}

        {/* Submit Action */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleIssue}
            disabled={isIssuing || !selectedHolder || !credTitle.trim()}
            className="gap-2 font-bold px-6 bg-primary hover:bg-primary/90 text-primary-foreground h-10"
          >
            {isIssuing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Layers className="w-4 h-4" />
            )}
            Issue & Sign Credential
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};