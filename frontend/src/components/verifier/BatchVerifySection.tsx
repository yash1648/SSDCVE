import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { FileDropzone } from '../common/FileDropzone';
import { EmptyState } from '../common/EmptyState';
import { BatchResultSideSheet } from './BatchResultSideSheet';
import { GlossaryTerm } from './GlossaryTerm';
import type { LucideIcon } from 'lucide-react';
import {
  Layers,
  Download,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  FileQuestion,
  WifiOff,
  HelpCircle,
} from 'lucide-react';
import { verifierApi } from '../../lib/api';
import { toast } from 'sonner';
import type {
  BatchVerificationResponse,
  BatchItemResult,
  VerificationChecks,
  VerificationStatus,
} from '../../types';

const CHIP: Record<VerificationStatus, { word: string; tone: string; Icon: LucideIcon }> = {
  VALID: { word: 'Valid', tone: 'text-primary border-primary/30 bg-primary/5', Icon: ShieldCheck },
  TAMPERED: { word: 'Changed', tone: 'text-destructive border-destructive/30 bg-destructive/5', Icon: ShieldAlert },
  REVOKED: { word: 'Withdrawn', tone: 'text-destructive border-destructive/30 bg-destructive/5', Icon: ShieldX },
  EXPIRED: { word: 'Expired', tone: 'text-accent border-accent/30 bg-accent/5', Icon: Clock },
  NOT_FOUND: { word: 'Not found', tone: 'text-muted-foreground border-border bg-muted/40', Icon: FileQuestion },
  UNAVAILABLE: { word: 'Unavailable', tone: 'text-muted-foreground border-border bg-muted/40', Icon: WifiOff },
};

const SealChip: React.FC<{ status: string }> = ({ status }) => {
  const chip = CHIP[status as VerificationStatus] ?? {
    word: status || 'Unknown',
    tone: 'text-muted-foreground border-border bg-muted/40',
    Icon: HelpCircle,
  };
  const { Icon } = chip;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${chip.tone}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {chip.word}
    </span>
  );
};

const CHECKS: { key: keyof VerificationChecks; label: string }[] = [
  { key: 'envelopeStructure', label: 'Complete file' },
  { key: 'schemaConformance', label: 'Required details present' },
  { key: 'issuerSignature', label: 'Issuer signature' },
  { key: 'onChainAnchor', label: 'Independent record' },
  { key: 'revocationStatus', label: 'Not withdrawn' },
  { key: 'ipfsIntegrity', label: 'Stored copy intact' },
];

export const BatchVerifySection: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchResponse, setBatchResponse] = useState<BatchVerificationResponse | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [sideSheetItem, setSideSheetItem] = useState<BatchItemResult | null>(null);

  const toggleRow = (idx: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleStartBatch = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setBatchResponse(null);
    setBatchError(null);
    setCsvError(null);
    setExpandedRows(new Set());

    try {
      const res = await verifierApi.verifyBatch(selectedFiles);
      setBatchResponse(res);
      toast.success(`Checked ${res.processed} certificates.`);
    } catch {
      setBatchError('The batch check could not finish. Make sure the files are certificate files or a valid ZIP archive, then try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCsv = async () => {
    if (!batchResponse) return;
    setIsExportingCsv(true);
    setCsvError(null);
    try {
      await verifierApi.exportBatchCsv(batchResponse);
      toast.success('CSV verification report downloaded.');
    } catch {
      setCsvError('The CSV report could not be downloaded. Try again in a moment.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const summary = batchResponse
    ? [
        { label: 'Checked', value: batchResponse.processed, tone: 'text-foreground' },
        { label: 'Valid', value: batchResponse.valid, tone: 'text-primary' },
        { label: 'Changed', value: batchResponse.tampered, tone: 'text-foreground' },
        { label: 'Withdrawn', value: batchResponse.revoked, tone: 'text-foreground' },
        { label: 'Expired', value: batchResponse.expired, tone: 'text-foreground' },
        { label: 'Not found', value: batchResponse.notFound, tone: 'text-foreground' },
      ]
    : [];

  const unchecked = batchResponse ? batchResponse.unavailable + batchResponse.failed : 0;

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <Layers className="w-4 h-4" aria-hidden />
            <CardTitle className="text-sm font-semibold">Batch check (JSON / ZIP)</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Upload several certificate files or one ZIP archive and get a result for each.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div id="batch-upload">
            <FileDropzone
              multiple
              accept=".json,.zip,application/json,application/zip"
              label="Drop several .json files or a .zip archive here"
              description="Up to 500 certificates in one go"
              selectedFiles={selectedFiles}
              onFileSelect={setSelectedFiles}
              onClear={() => setSelectedFiles([])}
              disabled={isProcessing}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleStartBatch}
              disabled={selectedFiles.length === 0 || isProcessing}
              aria-busy={isProcessing}
              className="gap-2 font-semibold"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  Checking {selectedFiles.length} file(s)
                </>
              ) : (
                <>
                  <FileCheck2 className="w-4 h-4" aria-hidden />
                  Run batch check
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isProcessing && (
        <div
          role="status"
          aria-busy="true"
          className="p-4 rounded-xl border border-primary/30 bg-primary/5 text-center text-xs text-primary font-semibold flex items-center justify-center gap-2"
        >
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          <span>Checking every certificate…</span>
        </div>
      )}

      {batchError && (
        <div role="alert" className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          {batchError}
        </div>
      )}

      {!batchResponse && !isProcessing && !batchError && (
        <EmptyState
          icon={Layers}
          title="No results yet"
          description="Upload certificate files or a ZIP archive above, then run the batch check to see every result here."
          actionLabel="Choose files"
          onAction={() =>
            document.querySelector<HTMLInputElement>('#batch-upload input[type="file"]')?.click()
          }
        />
      )}

      {batchResponse && (
        <div className="space-y-6">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {summary.map((s) => (
              <div key={s.label} className="p-3 rounded-xl border border-border bg-card text-center">
                <span className="block text-[11px] font-semibold uppercase text-muted-foreground">
                  {s.label}
                </span>
                <span className={`text-xl font-bold tabular-nums ${s.tone}`}>{s.value}</span>
              </div>
            ))}
          </div>
          {unchecked > 0 && (
            <p className="text-xs text-muted-foreground -mt-3">
              {unchecked} of {batchResponse.total} could not be checked. Run those files again.
            </p>
          )}

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-foreground">
                Results by file
              </h3>
              <p className="text-xs text-muted-foreground tabular-nums">
                {batchResponse.processed} of {batchResponse.total} certificates checked
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <Button
                variant="outline"
                onClick={handleExportCsv}
                disabled={isExportingCsv}
                aria-busy={isExportingCsv}
                className="gap-2 font-semibold h-9"
              >
                {isExportingCsv ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="w-4 h-4" aria-hidden />
                )}
                Download CSV
              </Button>
              {csvError && (
                <p role="alert" className="text-xs text-destructive">
                  {csvError}
                </p>
              )}
            </div>
          </div>

          <Card className="border-border">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Graduate</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="text-right">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchResponse.results.map((item, idx) => {
                    const isExpanded = expandedRows.has(idx);

                    return (
                      <React.Fragment key={idx}>
                        <TableRow
                          onClick={() => toggleRow(idx)}
                          className="cursor-pointer"
                        >
                          <TableCell className="font-mono text-xs max-w-[180px] truncate">
                            <span className="flex items-center gap-1.5">
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
                              )}
                              <span className="truncate">{item.fileName}</span>
                            </span>
                          </TableCell>
                          <TableCell className="font-mono tabular-nums text-xs">
                            {item.credentialNumber || '-'}
                          </TableCell>
                          <TableCell className="text-xs">{item.recipientName || '-'}</TableCell>
                          <TableCell className="text-xs">{item.issuerName || '-'}</TableCell>
                          <TableCell>
                            <SealChip status={item.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSideSheetItem(item);
                              }}
                              className="text-xs h-7 px-2.5 text-primary"
                            >
                              View full result
                            </Button>
                          </TableCell>
                        </TableRow>

                        {isExpanded && item.checks && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={6} className="p-4 space-y-3">
                              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                What was checked
                              </span>
                              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                                {CHECKS.map((c) => {
                                  const passed = item.checks[c.key];
                                  return (
                                    <div
                                      key={c.key}
                                      className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-xs"
                                    >
                                      <span
                                        aria-hidden
                                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${
                                          passed ? 'bg-primary' : 'bg-destructive'
                                        }`}
                                      >
                                        {passed ? (
                                          <Check className="h-3 w-3" />
                                        ) : (
                                          <X className="h-3 w-3" />
                                        )}
                                      </span>
                                      <GlossaryTerm term={c.key}>
                                        <span className="font-semibold text-foreground">{c.label}</span>
                                      </GlossaryTerm>
                                      <span className="sr-only">{passed ? 'passed' : 'failed'}</span>
                                      <span aria-hidden className="ml-auto text-muted-foreground">
                                        {passed ? 'Pass' : 'Fail'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              {item.errorMessage && (
                                <div role="alert" className="flex items-center gap-1.5 pt-1 text-xs text-destructive">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                  <span>{item.errorMessage}</span>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      <BatchResultSideSheet
        item={sideSheetItem}
        open={!!sideSheetItem}
        onOpenChange={(open) => !open && setSideSheetItem(null)}
      />
    </div>
  );
};
