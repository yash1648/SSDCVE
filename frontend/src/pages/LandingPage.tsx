import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileCheck2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '../hooks/useAuth';
import { verifierApi } from '../lib/api';

const formatUtc = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'date unavailable';
  return (
    d.toLocaleString('en-GB', {
      timeZone: 'UTC',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' UTC'
  );
};

// Registry landing: mission hero, live record strip, how checking works, closing call.
// The record strip shows real chain data only; while loading it shows
// skeletons, on failure it hides so public content never hard-fails.
export const LandingPage: React.FC = () => {
  const { isAuthenticated, user, getDashboardPath } = useAuth();
  const dashboard = user ? getDashboardPath(user.role) : null;

  const {
    data: chainStatus,
    isLoading: statusLoading,
    isError: statusError,
  } = useQuery({
    queryKey: ['chain-status'],
    queryFn: verifierApi.getChainStatus,
    refetchInterval: 30000,
    retry: false,
  });

  const {
    data: recentAnchors,
    isLoading: anchorsLoading,
    isError: anchorsError,
  } = useQuery({
    queryKey: ['recent-anchors', 5],
    queryFn: () => verifierApi.getRecentAnchors(5),
    refetchInterval: 30000,
    retry: false,
  });

  const loading = statusLoading || anchorsLoading;
  const failed = statusError || anchorsError;
  const showStrip = !failed && (loading || chainStatus);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Hero: mission plus credibility */}
      <section className="max-w-3xl space-y-5">
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
          Certificates you can check in seconds.
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
          SSDCVE is a verification registry. Institutions record certificates
          here, graduates carry them, and anyone can confirm one is genuine.
          No account needed to check.
        </p>
        {chainStatus && !statusError && (
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground tabular-nums">{chainStatus.anchoredCount}</strong>{' '}
            certificates recorded and counting.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button size="lg" asChild className="min-h-[48px]">
            <Link to="/verify">
              <FileCheck2 className="h-4 w-4" />
              Check a certificate
            </Link>
          </Button>
          {isAuthenticated && dashboard ? (
            <Button size="lg" variant="outline" asChild className="min-h-[48px]">
              <Link to={dashboard}>Go to dashboard</Link>
            </Button>
          ) : (
            <Button size="lg" variant="outline" asChild className="min-h-[48px]">
              <Link to="/register">Create account</Link>
            </Button>
          )}
        </div>
      </section>

      {/* Live record strip: real numbers, skeletons while loading, hidden on failure */}
      {showStrip && (
        <section aria-label="Latest registry records" className="mt-10 border-y border-border py-4">
          {loading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading registry records">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            chainStatus && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Certificates recorded{' '}
                  <strong className="text-foreground tabular-nums">{chainStatus.anchoredCount}</strong>
                  {' '}on record{' '}
                  <strong className="text-foreground tabular-nums">#{chainStatus.chainId}</strong>
                  {chainStatus.latestBlock !== null && (
                    <>
                      {', '}latest entry{' '}
                      <strong className="text-foreground tabular-nums">block #{chainStatus.latestBlock}</strong>
                    </>
                  )}
                </p>
                {recentAnchors && recentAnchors.length > 0 && (
                  <ul className="divide-y divide-border border-y border-border">
                    {recentAnchors.map((a) => (
                      <li key={a.credentialNumber} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm">
                        <span className="font-mono tabular-nums text-foreground">{a.credentialNumber}</span>
                        <span className="text-muted-foreground">{a.issuerName}</span>
                        <span className="ml-auto text-muted-foreground tabular-nums">
                          {a.blockNumber !== null ? `block #${a.blockNumber}, ` : ''}
                          {formatUtc(a.anchoredAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link to="/chain" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  Inspect the record <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )
          )}
        </section>
      )}

      {/* How checking works */}
      <section className="mt-12 max-w-3xl">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          How checking works
        </h2>
        <ol className="mt-4 divide-y divide-border border-y border-border">
          {[
            {
              n: '01',
              title: 'Get the certificate file',
              body: 'Ask the graduate for their certificate file, or scan the QR code on a printed copy.',
            },
            {
              n: '02',
              title: 'Bring it here',
              body: 'Upload the file on the check page, or type its reference number.',
            },
            {
              n: '03',
              title: 'Read the answer',
              body: 'Genuine or not, with the institution name and dates shown beside it.',
            },
          ].map((s) => (
            <li key={s.n} className="flex gap-4 py-4">
              <span className="font-mono text-sm text-muted-foreground shrink-0 pt-0.5">{s.n}</span>
              <div>
                <p className="font-semibold text-foreground">{s.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Closing call */}
      <section className="mt-12 max-w-3xl rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Hold a certificate to check?
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Bring the file or its reference number. The answer takes seconds and
          needs no account.
        </p>
        <Button size="lg" asChild className="min-h-[48px]">
          <Link to="/verify">
            <FileCheck2 className="h-4 w-4" />
            Check a certificate
          </Link>
        </Button>
      </section>
    </div>
  );
};
