import React, { useState, type ChangeEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { StatusBadge } from '../common/StatusBadge';
import { HashDisplay } from '../common/HashDisplay';
import { DateTime } from '../common/DateTime';
import { GlossaryTerm } from '../verifier/GlossaryTerm';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Upload,
  Ban,
  Loader2,
  X,
  AlertCircle,
  Download,
  Shield,
} from 'lucide-react';
import { issuerApi } from '../../lib/api';
import { holderApi } from '../../lib/api';
import { toast } from 'sonner';
import type { IssuerCredential } from '../../types';

interface IssuerCredentialDetailProps {
  credential: IssuerCredential;
  onRefresh: () => void;
  onClose: () => void;
}

export const IssuerCredentialDetail: React.FC<IssuerCredentialDetailProps> = ({
  credential,
  onRefresh,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [documentCid, setDocumentCid] = useState<string | null>(
    credential.documentCid || null
  );

  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadDocument = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const res = await issuerApi.attachDocument(credential.id, selectedFile);
      setDocumentCid(res.documentCid ?? null);
      toast.success('Supporting document attached.');
      setSelectedFile(null);
      onRefresh();
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 415) {
        setUploadError('Only PDF documents and PNG or JPEG images can be attached.');
      } else {
        setUploadError('Failed to upload document. Please try again.');
      }
      toast.error('Failed to attach document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadCertificate = async () => {
    try {
      await holderApi.downloadCertificate(credential.id);
      toast.success('Certificate downloaded.');
    } catch {
      toast.error('Failed to download certificate.');
    }
  };

  const handleRevokeConfirm = async () => {
    setIsRevoking(true);
    setRevokeError(null);
    try {
      await issuerApi.revokeCredential(credential.id, {
        reason: revokeReason.trim() || undefined,
      });
      toast.success(`Credential ${credential.credentialNumber} revoked.`);
      setShowRevokeDialog(false);
      onRefresh();
      onClose();
    } catch {
      setRevokeError('Failed to revoke credential. Please try again.');
      toast.error('Failed to revoke credential.');
    } finally {
      setIsRevoking(false);
    }
  };

  const currentStatus = credential.status;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
        <DialogHeader className="flex flex-row items-start justify-between border-b pb-4">
          <div className="space-y-2 text-left">
            <DialogTitle className="text-xl font-bold text-foreground tabular-nums">
              {credential.credentialNumber}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <StatusBadge status={currentStatus as any} />
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {credential.type}
              </span>
            </div>
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

        <div className="space-y-6">
          {/* Metadata Section */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider">
                Credential Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid grid-cols-[auto_1fr] gap-y-3 gap-x-4 text-sm">
                <dt className="text-muted-foreground">Title</dt>
                <dd className="font-medium text-foreground">{credential.title}</dd>

                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-medium text-foreground">{credential.type}</dd>

                <dt className="text-muted-foreground">Recipient</dt>
                <dd className="font-medium text-foreground">{credential.subjectName}</dd>

                <dt className="text-muted-foreground">Issued (UTC)</dt>
                <dd className="font-medium text-foreground font-mono tabular-nums">
                  <DateTime value={credential.issuedAt} showTime={true} />
                </dd>

                <dt className="text-muted-foreground">Expires (UTC)</dt>
                <dd className="font-medium text-foreground font-mono tabular-nums">
                  {credential.expiresAt ? (
                    <DateTime value={credential.expiresAt} showTime={true} />
                  ) : (
                    <span className="text-muted-foreground">No expiry</span>
                  )}
                </dd>
              </dl>
            </CardContent>
          </Card>

          {/* Hashes Section */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider">
                Hashes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid grid-cols-[auto_1fr] gap-y-3 gap-x-4 text-sm">
                <dt className="text-muted-foreground">
                  <GlossaryTerm term="contentHash">Content hash</GlossaryTerm>
                </dt>
                <dd className="font-mono tabular-nums">
                  <HashDisplay value={credential.contentHash} truncateLength={12} />
                </dd>

                <dt className="text-muted-foreground">
                  <GlossaryTerm term="txHash">Transaction hash</GlossaryTerm>
                </dt>
                <dd className="font-mono tabular-nums">
                  <HashDisplay
                    value={credential.anchorTxHash}
                    truncateLength={12}
                  />
                </dd>
              </dl>
            </CardContent>
          </Card>

          {/* Signature Section */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider">
                Signature
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid grid-cols-[auto_1fr] gap-y-3 gap-x-4 text-sm">
                <dt className="text-muted-foreground">Algorithm</dt>
                <dd className="font-medium text-foreground font-mono tabular-nums">
                  {credential.signatureAlgorithm}
                </dd>

                <dt className="text-muted-foreground">Key ID</dt>
                <dd className="font-medium text-foreground font-mono tabular-nums">
                  {credential.keyId}
                </dd>
              </dl>
            </CardContent>
          </Card>

          {/* Supporting Document Section */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider">
                Supporting Document
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {documentCid ? (
                <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold">Document attached</span>
                  </div>
                  <HashDisplay value={documentCid} truncateLength={10} />
                </div>
              ) : null}

              <form onSubmit={handleUploadDocument} className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    disabled={isUploading || currentStatus === 'REVOKED'}
                    className="text-xs cursor-pointer"
                    accept=".pdf,.png,.jpg,.jpeg"
                    aria-label="Select document to attach"
                  />
                  <Button
                    type="submit"
                    disabled={!selectedFile || isUploading || currentStatus === 'REVOKED'}
                    className="shrink-0 gap-1.5 font-semibold text-xs h-9"
                  >
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    Attach Document
                  </Button>
                </div>

                {uploadError && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Actions Row */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCertificate}
              disabled={currentStatus === 'REVOKED'}
              className="gap-1.5 text-xs h-8"
            >
              <Download className="w-3.5 h-3.5" />
              Download Certificate
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowRevokeDialog(true)}
              disabled={currentStatus === 'REVOKED' || isRevoking}
              className="gap-1.5 text-xs h-8 font-semibold"
            >
              <Ban className="w-3.5 h-3.5" />
              Revoke
            </Button>
          </div>
        </div>

        {/* Revoke Confirm Dialog */}
        <ConfirmDialog
          open={showRevokeDialog}
          onOpenChange={setShowRevokeDialog}
          title="Revoke Credential"
          description="This action cannot be undone. The credential will be marked as revoked on-chain and verifiers will see it as invalid."
          confirmLabel="Revoke"
          cancelLabel="Cancel"
          variant="destructive"
          isLoading={isRevoking}
          onConfirm={handleRevokeConfirm}
        >
          <div className="space-y-3 mt-2">
            <label
              htmlFor="revoke-reason"
              className="block text-xs font-medium text-muted-foreground"
            >
              Reason (optional)
            </label>
            <textarea
              id="revoke-reason"
              value={revokeReason}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRevokeReason(e.target.value)}
              placeholder="Enter reason for revocation"
              maxLength={1000}
              rows={3}
              className="text-xs w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isRevoking}
            />
            <div className="text-right text-[11px] text-muted-foreground">
              {revokeReason.length} / 1000
            </div>
            {revokeError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{revokeError}</span>
              </div>
            )}
          </div>
        </ConfirmDialog>
      </DialogContent>
    </Dialog>
  );
};