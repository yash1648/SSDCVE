import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { verifierApi } from '../lib/api';
import type { VerificationResult } from '../types';
import { VerificationResultHero } from '../components/verifier/VerificationResultHero';
import { ResultSeal } from '../components/verifier/ResultSeal';
import { ArrowLeft, ShieldAlert, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const VerifyByIdPage: React.FC = () => {
  const { credentialId } = useParams<{ credentialId: string }>();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  const fetchVerification = async () => {
    if (!credentialId) return;
    setLoading(true);
    setError(false);
    setNotFound(false);

    try {
      const data = await verifierApi.verifyById(credentialId);
      setResult(data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentialId]);

  return (
    <div className="mx-auto max-w-5xl py-10 px-4 sm:px-6 space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-xs">
          <Link to="/verify">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to checking
          </Link>
        </Button>
        <span className="font-mono tabular-nums text-xs text-muted-foreground truncate max-w-xs">
          Ref: {credentialId}
        </span>
      </div>

      {loading ? (
        <div aria-busy="true" aria-label="Checking this certificate" className="space-y-4">
          <div className="h-44 rounded-xl border border-border bg-muted/40 motion-safe:animate-pulse" />
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 rounded-xl border border-border bg-muted/40 motion-safe:animate-pulse"
              />
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">Checking this certificate…</p>
        </div>
      ) : notFound ? (
        <div className="mx-auto max-w-2xl space-y-4">
          <ResultSeal
            status="NOT_FOUND"
            reason="No record matches this reference. Check the reference and try again."
          />
          <div className="flex gap-2">
            <Button variant="outline" asChild className="flex-1 text-xs">
              <Link to="/verify">Back to checking</Link>
            </Button>
            <Button asChild className="flex-1 text-xs">
              <Link to="/verify">Upload a file instead</Link>
            </Button>
          </div>
        </div>
      ) : error ? (
        <Card className="mx-auto max-w-lg text-center border-border">
          <CardContent className="space-y-4 pt-8 pb-8">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/5 text-destructive">
              <ShieldAlert className="h-7 w-7" aria-hidden />
            </div>
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              <p className="font-bold">Could not check this certificate</p>
              <p className="mt-1 text-xs">
                The check failed before it could finish. Please try again in a moment.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={fetchVerification} className="flex-1 gap-1.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Retry
              </Button>
              <Button asChild className="flex-1 text-xs">
                <Link to="/verify">Upload file instead</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : result ? (
        <VerificationResultHero result={result} onReset={fetchVerification} />
      ) : null}
    </div>
  );
};
