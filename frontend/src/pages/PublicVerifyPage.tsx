import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifierApi } from '../lib/api';
import { FileDropzone } from '../components/common/FileDropzone';
import { VerificationResultHero } from '../components/verifier/VerificationResultHero';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { ShieldCheck, Search, Layers, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import type { VerificationResult } from '../types';

export const PublicVerifyPage: React.FC = () => {
  const navigate = useNavigate();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');

  const handleFileDrop = async (files: File[]) => {
    setSelectedFiles(files);
    if (files.length === 0) return;

    setIsVerifying(true);
    setResult(null);
    setError(null);

    try {
      const res = await verifierApi.verifyFile(files[0]);
      setResult(res);
      if (res.status === 'VALID') {
        toast.success('This certificate is genuine.');
      }
    } catch {
      setError('Could not check that file. Make sure it is a certificate file, then try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSelectedFiles([]);
    setError(null);
  };

  const handleVerifyById = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualId.trim();
    if (!trimmed) return;
    navigate(`/verify/${trimmed}`);
  };

  return (
    <div className="mx-auto max-w-5xl py-10 px-4 sm:px-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" aria-hidden />
            Public check
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Verify a certificate
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            No account needed. Upload the certificate file, or look it up by reference.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/verify/batch')}
          className="gap-2 h-9 self-start sm:self-auto font-semibold"
        >
          <Layers className="w-4 h-4 text-primary" aria-hidden />
          Batch check (many at once)
        </Button>
      </div>

      {result ? (
        <VerificationResultHero result={result} onReset={handleReset} />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            <FileDropzone
              accept=".json,application/json"
              label="Choose certificate file"
              description="Checking starts as soon as you choose the file"
              selectedFiles={selectedFiles}
              onFileSelect={handleFileDrop}
              onClear={() => setSelectedFiles([])}
              disabled={isVerifying}
            />

            {isVerifying && (
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 text-center text-xs text-primary font-semibold flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                <span>Checking the certificate…</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive"
              >
                {error}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-primary">
                  <Search className="w-4 h-4" aria-hidden />
                  <CardTitle className="text-sm font-semibold">Check by reference</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Type the reference number from a printed certificate, or scan its QR code.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerifyById} className="space-y-3">
                  <Input
                    placeholder="e.g. 123e4567-e89b..."
                    value={manualId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualId(e.target.value)}
                    className="font-mono tabular-nums text-xs"
                  />
                  <Button
                    type="submit"
                    disabled={!manualId.trim()}
                    className="w-full font-semibold gap-1.5 text-xs h-9"
                  >
                    Lookup & Verify <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border bg-muted/30">
              <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
                <strong className="text-foreground block">How checking works:</strong>
                <p className="leading-relaxed text-[11px]">
                  We confirm the certificate is unchanged, signed by its institution, and independently recorded, then give you a clear answer.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
