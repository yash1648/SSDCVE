import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { StatusBadge } from '../common/StatusBadge';
import { HashDisplay } from '../common/HashDisplay';
import { DateTime } from '../common/DateTime';
import { SelectiveDisclosurePanel } from './SelectiveDisclosurePanel';
import { QRCodeDisplay } from '../qr/QRCodeDisplay';
import {
  Download,
  Building2,
  Calendar,
  Layers,
  ArrowLeft,
  Loader2,
  QrCode,
} from 'lucide-react';
import { holderApi } from '../../lib/api';
import { toast } from 'sonner';
import type { WalletCredential } from '../../types';

interface HolderCredentialDetailProps {
  credential: WalletCredential;
  onBack: () => void;
}

export const HolderCredentialDetail: React.FC<HolderCredentialDetailProps> = ({
  credential,
  onBack,
}) => {
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const handleDownloadEnvelope = async () => {
    setDownloadingJson(true);
    try {
      const filename = `credential-${credential.credentialNumber}.json`;
      await holderApi.downloadEnvelope(credential.credentialId, filename);
      toast.success(`Downloaded ${filename}`);
    } catch {
      toast.error('Failed to download credential envelope.');
    } finally {
      setDownloadingJson(false);
    }
  };

  const handleDownloadCertificate = async () => {
    setDownloadingPdf(true);
    try {
      const filename = `certificate-${credential.credentialNumber}.pdf`;
      await holderApi.downloadCertificate(credential.credentialId, filename);
      toast.success(`Downloaded ${filename}`);
    } catch {
      toast.error('Failed to download certificate PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const publicVerificationUrl = `${window.location.origin}/verify/${credential.credentialId}`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-card border border-border rounded-xl">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-7 px-2 -ml-2 text-xs text-muted-foreground gap-1.5 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Wallet
          </Button>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-foreground">{credential.title}</h2>
            <StatusBadge status={credential.status} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono">
            <span>Number: <strong>{credential.credentialNumber}</strong></span>
            <span>•</span>
            <span>Type: {credential.type}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQrOpen(!qrOpen)}
            className="gap-2 h-9 text-xs"
          >
            <QrCode className="w-4 h-4 text-primary" />
            {qrOpen ? 'Hide QR' : 'Share QR'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadEnvelope}
            disabled={downloadingJson}
            className="gap-2 h-9 text-xs font-semibold"
          >
            {downloadingJson ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download JSON
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadCertificate}
            disabled={downloadingPdf}
            className="gap-2 h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Certificate PDF
          </Button>
        </div>
      </div>

      {/* QR Code Presentation Tray */}
      {qrOpen && (
        <Card className="border-border bg-card/60 animate-in fade-in slide-in-from-top-2 duration-200">
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-base font-semibold">Public Verification QR Code</CardTitle>
            <CardDescription className="text-xs">
              Anyone scanning this QR code will go straight to this certificate's check page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
            <div className="p-4 bg-white rounded-2xl shadow-md border border-border">
              <QRCodeDisplay value={publicVerificationUrl} size={180} />
            </div>
            <span className="font-mono text-[11px] text-muted-foreground break-all select-all">
              {publicVerificationUrl}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Credential Attributes Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-primary">
              <Building2 className="w-4 h-4" />
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Issuing Institution
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div className="font-semibold text-foreground text-sm">{credential.issuerName}</div>
            <div className="font-mono text-muted-foreground">{credential.issuerDomain}</div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-primary">
              <Calendar className="w-4 h-4" />
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Validity Dates
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div>
              <span className="text-muted-foreground">Conferred: </span>
              <DateTime value={credential.issuedAt} />
            </div>
            <div>
              <span className="text-muted-foreground">Expires: </span>
              {credential.expiresAt ? <DateTime value={credential.expiresAt} /> : 'Permanent'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-purple-500">
              <Layers className="w-4 h-4" />
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ledger record
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div>
              <span className="text-muted-foreground">Reference: </span>
              <HashDisplay value={credential.anchorTxHash} truncateLength={6} />
            </div>
            <div className="font-mono text-muted-foreground">
              Block #{credential.anchorBlockNumber ?? '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selective Disclosure Privacy Panel */}
      <SelectiveDisclosurePanel credentialId={credential.credentialId} />
    </div>
  );
};
