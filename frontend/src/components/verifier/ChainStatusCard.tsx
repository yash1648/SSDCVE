import React, { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { verifierApi } from '../../lib/api';
import type { ChainStatus } from '../../types/verifier';

// Live chain numbers. Loads once on mount; on failure the values
// show a dash so public content never hard-fails on the API.
export const ChainStatusCard: React.FC = () => {
  const [status, setStatus] = useState<ChainStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setStatus(await verifierApi.getChainStatus());
      } catch {
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4 text-primary" aria-hidden="true" />
          Chain status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-3" aria-busy="true" aria-label="Loading chain status">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Chain id</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                {status ? status.chainId : '-'}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Latest block</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                {status?.latestBlock ?? '-'}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Anchored count</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                {status?.anchoredCount ?? '-'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
