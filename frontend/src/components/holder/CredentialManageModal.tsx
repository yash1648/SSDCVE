import React, { useEffect, useState } from 'react';
import type { WalletCredential, DisclosureData } from '../../types';
import { holderApi } from '../../lib/api';
import { QRCodeSVG } from 'qrcode.react';
import {
  Eye,
  EyeOff,
  QrCode,
  Copy,
  Check,
  Download,
  Loader2,
  FileBadge,
  FileText,
  ExternalLink,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { GlossaryTerm } from '../verifier/GlossaryTerm';
import { toast } from 'sonner';

interface CredentialManageModalProps {
  credential: WalletCredential;
  initialTab?: 'privacy' | 'share' | 'download';
  onClose: () => void;
}

export const CredentialManageModal: React.FC<CredentialManageModalProps> = ({
  credential,
  initialTab = 'download',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'share' | 'download'>(initialTab);

  const [disclosure, setDisclosure] = useState<DisclosureData | null>(null);
  const [loadingDisclosure, setLoadingDisclosure] = useState(false);
  const [savingDisclosure, setSavingDisclosure] = useState(false);
  const [hiddenClaimsSet, setHiddenClaimsSet] = useState<Set<string>>(new Set());

  const [downloadingJson, setDownloadingJson] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);

  const verifyUrl = `${window.location.origin}/verify/${credential.credentialId}`;

  useEffect(() => {
    loadDisclosure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credential.credentialId]);

  const loadDisclosure = async () => {
    setLoadingDisclosure(true);
    try {
      const data = await holderApi.getDisclosure(credential.credentialId);
      setDisclosure(data);
      setHiddenClaimsSet(new Set(data.hiddenClaims || []));
    } catch {
      toast.error('Could not load privacy settings.');
    } finally {
      setLoadingDisclosure(false);
    }
  };

  const handleToggleClaim = async (claimKey: string) => {
    const nextSet = new Set(hiddenClaimsSet);
    if (nextSet.has(claimKey)) {
      nextSet.delete(claimKey);
    } else {
      nextSet.add(claimKey);
    }
    setHiddenClaimsSet(nextSet);

    setSavingDisclosure(true);
    try {
      const updated = await holderApi.updateDisclosure(credential.credentialId, {
        hiddenClaims: Array.from(nextSet),
      });
      setDisclosure(updated);
      toast.success(
        nextSet.has(claimKey)
          ? `Claim "${claimKey}" will be hidden from verifiers.`
          : `Claim "${claimKey}" will be disclosed to verifiers.`
      );
    } catch {
      toast.error('Could not update privacy settings.');
      setHiddenClaimsSet(new Set(disclosure?.hiddenClaims || []));
    } finally {
      setSavingDisclosure(false);
    }
  };

  const download = async (kind: 'envelope' | 'certificate') => {
    const setBusy = kind === 'envelope' ? setDownloadingJson : setDownloadingPdf;
    setDownloadError(null);
    setBusy(true);
    try {
      const { filename } =
        kind === 'envelope'
          ? await holderApi.downloadEnvelope(credential.credentialId)
          : await holderApi.downloadCertificate(credential.credentialId);
      toast.success(`Downloaded ${filename}`);
    } catch {
      const msg = kind === 'envelope' ? 'Could not download certificate file.' : 'Could not download PDF.';
      setDownloadError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = (text: string, type: 'url' | 'number') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    }
    toast.success('Copied to clipboard.');
  };

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-6 space-y-6">
        <DialogHeader className="flex flex-row items-start justify-between border-b pb-4">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <Badge
                variant={credential.status === 'ACTIVE' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {credential.status === 'ACTIVE' ? 'Active' : 'Cancelled'}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">{credential.type}</span>
            </div>
            <DialogTitle className="text-xl font-bold">{credential.title}</DialogTitle>
            <DialogDescription className="text-xs">
              Issued by {credential.issuerName} ({credential.issuerDomain})
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="download">Download Files</TabsTrigger>
            <TabsTrigger value="privacy">
              <GlossaryTerm term="envelopeStructure">Selective Disclosure</GlossaryTerm>
            </TabsTrigger>
            <TabsTrigger value="share">Share</TabsTrigger>
          </TabsList>

          {/* Downloads Tab */}
          <TabsContent value="download" className="space-y-5 pt-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Certificate files
              </h3>
              <p className="text-xs text-muted-foreground">
                The secure digital file and a printable PDF version of your certificate.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col justify-between space-y-4 rounded-xl border border-border p-4 bg-card">
                <div className="space-y-1.5">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileBadge className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold">Certificate file</h4>
                  <p className="text-xs text-muted-foreground">
                    The secure digital file. Share it with employers so they can check it.
                  </p>
                </div>
                <Button
                  onClick={() => download('envelope')}
                  disabled={downloadingJson}
                  className="w-full gap-2 font-semibold text-xs h-9"
                >
                  {downloadingJson ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download file
                </Button>
                {downloadError && (
                  <div role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{downloadError}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between space-y-4 rounded-xl border border-border p-4 bg-card">
                <div className="space-y-1.5">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold">Printable certificate</h4>
                  <p className="text-xs text-muted-foreground">
                    A formal printable version, complete with a QR code for easy checking.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => download('certificate')}
                  disabled={downloadingPdf}
                  className="w-full gap-2 font-semibold text-xs h-9"
                >
                  {downloadingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download PDF
                </Button>
                {downloadError && (
                  <div role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{downloadError}</span>
                  </div>
                )}
              </div>
            </div>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground pt-1">
              <QrCode className="h-3.5 w-3.5 text-primary" />
              Tip: employers check the certificate file on the verification page.
            </p>
          </TabsContent>

          {/* Disclosure / Selective Disclosure Tab */}
          <TabsContent value="privacy" className="space-y-4 pt-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                <GlossaryTerm term="envelopeStructure">Selective Disclosure</GlossaryTerm>
              </h3>
              <p className="text-xs text-muted-foreground">
                Choose which details verifiers can see. Hidden details stay private, and the certificate stays verifiable.
              </p>
            </div>

            {loadingDisclosure ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Loading privacy configuration...
              </div>
            ) : !disclosure || Object.keys(disclosure.claims || {}).length === 0 ? (
              <p className="rounded-lg border p-6 text-center text-xs text-muted-foreground">
                This credential does not contain selective disclosure attributes.
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(disclosure.claims).map(([key, val]) => {
                  const isHidden = hiddenClaimsSet.has(key);
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-xl border border-border p-3 bg-card"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <GlossaryTerm term="schemaConformance">
                            <span className="text-xs font-bold uppercase font-mono">{key}</span>
                          </GlossaryTerm>
                          {isHidden ? (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              Hidden
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Shared
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                          {isHidden ? '••••••••' : formatValue(val)}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        data-claim-toggle={key}
                        variant={isHidden ? 'outline' : 'secondary'}
                        onClick={() => handleToggleClaim(key)}
                        disabled={savingDisclosure}
                        className="gap-1.5 text-xs h-8"
                      >
                        {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {isHidden ? 'Reveal' : 'Hide'}
                      </Button>
                    </div>
                  );
                })}

                {/* Verifier Will See vs Won't See */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
                  <div className="space-y-1.5 rounded-xl border border-border p-3.5 text-xs bg-muted/50">
                    <div className="flex items-center gap-1.5 font-bold text-primary">
                      <Eye className="h-3.5 w-3.5" />
                      Verifier Will See:
                    </div>
                    <ul className="space-y-1 text-muted-foreground pl-1">
                      {Object.keys(disclosure.claims)
                        .filter((k) => !hiddenClaimsSet.has(k))
                        .map((k) => (
                          <li key={k} className="font-mono text-[11px] list-disc list-inside tabular-nums">
                            {k}
                          </li>
                        ))}
                      {Object.keys(disclosure.claims).filter((k) => !hiddenClaimsSet.has(k)).length === 0 && (
                        <li className="italic text-muted-foreground">All claims hidden.</li>
                      )}
                    </ul>
                  </div>

                  <div className="space-y-1.5 rounded-xl border border-border p-3.5 text-xs bg-muted/50">
                    <div className="flex items-center gap-1.5 font-bold text-destructive">
                      <EyeOff className="h-3.5 w-3.5" />
                      Verifier Won't See:
                    </div>
                    <ul className="space-y-1 text-muted-foreground pl-1">
                      {Array.from(hiddenClaimsSet).map((k) => (
                        <li key={k} className="font-mono text-[11px] list-disc list-inside line-through tabular-nums">
                          {k}
                        </li>
                      ))}
                      {hiddenClaimsSet.size === 0 && (
                        <li className="italic text-muted-foreground">No claims hidden.</li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('download')}
                    className="gap-1.5 text-xs h-8"
                  >
                    Download Files →
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Share / QR Code Tab */}
          <TabsContent value="share" className="space-y-5 pt-3 text-center">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Instant Verification QR Code
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                Public Verification Link encoded into high-fidelity QR code. Verifiers scan to fetch and verify directly.
              </p>
            </div>

            <div className="mx-auto w-fit rounded-2xl bg-background p-5 shadow-md border border-border">
              <QRCodeSVG value={verifyUrl} size={190} level="M" includeMargin={false} />
            </div>

            <div className="mx-auto max-w-lg space-y-2.5 text-left">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Public Verification Link:
                </span>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-xs">
                  <span className="flex-1 truncate pl-1 font-mono text-xs text-foreground tabular-nums">
                    {verifyUrl}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(verifyUrl, 'url')}
                    aria-label="Copy link"
                    className="h-7 w-7"
                  >
                    {copiedUrl ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" asChild className="h-7 w-7">
                    <a href={verifyUrl} target="_blank" rel="noreferrer" aria-label="Open link">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Credential Reference Number:
                </span>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-xs">
                  <span className="flex-1 truncate pl-1 font-mono text-xs font-bold text-foreground tabular-nums">
                    {credential.credentialNumber}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(credential.credentialNumber, 'number')}
                    aria-label="Copy reference"
                    className="h-7 w-7"
                  >
                    {copiedNumber ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};