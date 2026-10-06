import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { verifierApi } from '../lib/api';
import { DataTable, type Column } from '../components/common/DataTable';
import { VerificationStatusBadge } from '../components/common/VerificationStatusBadge';
import { Error403 } from '../components/errors/Error403';
import { Button } from '../components/ui/button';
import { History, RefreshCw, ArrowLeft, TriangleAlert } from 'lucide-react';
import type { VerificationHistoryResponse, VerificationStatus } from '../types';

type ForbiddenError = AxiosError & { isForbidden?: boolean };

const formatUtc = (value: string | null | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '-';
  return `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
};

export const VerifierHistoryPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const {
    data: history = [],
    error,
    refetch,
    isLoading,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ['verifier-history'],
    queryFn: verifierApi.getHistory,
  });

  const isForbidden = (error as ForbiddenError | null)?.isForbidden === true;

  const filteredHistory = useMemo(() => {
    if (statusFilter === 'ALL') return history;
    return history.filter((h) => h.result === statusFilter);
  }, [history, statusFilter]);

  const columns: Column<VerificationHistoryResponse>[] = [
    {
      key: 'credentialNumber',
      header: 'Credential Number',
      sortable: true,
      accessor: (h) => (
        <span className="font-mono font-bold text-xs text-foreground tabular-nums">
          {h.credentialNumber || '-'}
        </span>
      ),
    },
    {
      key: 'result',
      header: 'Verification Result',
      sortable: true,
      accessor: (h) => <VerificationStatusBadge status={h.result} size="sm" />,
    },
    {
      key: 'reason',
      header: 'Audit Note',
      accessor: (h) => (
        <span className="text-xs text-muted-foreground truncate max-w-sm block" title={h.reason || ''}>
          {h.reason || 'Verification passed'}
        </span>
      ),
    },
    {
      key: 'verifiedAt',
      header: 'Verified (UTC)',
      sortable: true,
      accessor: (h) => (
        <span title={h.verifiedAt || ''} className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          {formatUtc(h.verifiedAt)}
        </span>
      ),
    },
  ];

  const statuses: Array<VerificationStatus | 'ALL'> = [
    'ALL',
    'VALID',
    'TAMPERED',
    'REVOKED',
    'EXPIRED',
    'NOT_FOUND',
    'UNAVAILABLE',
  ];

  if (isForbidden) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Checking history is not authorized for your role.
        </p>
        <Error403 />
        <div className="flex justify-center">
          <Button asChild variant="outline" size="sm" className="gap-2 h-9">
            <Link to="/verifier">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to verifier workspace
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Verification History
          </h2>
          <p className="text-xs text-muted-foreground">
            Audited evaluations performed while signed into your verifier account.
          </p>
        </div>
        <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-6 text-center space-y-3">
          <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <TriangleAlert className="h-5 w-5 text-destructive" />
          </div>
          <p className="text-sm text-foreground font-medium">History could not be loaded.</p>
          <p className="text-xs text-muted-foreground">Please try again. If this keeps happening, sign in again.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2 h-9">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const isEmpty = !isLoading && history.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Verification History
          </h2>
          <p className="text-xs text-muted-foreground">
            Audited evaluations performed while signed into your verifier account.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 h-9"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh History
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
        <label htmlFor="history-outcome-filter" className="text-xs text-muted-foreground font-medium">Outcome:</label>
        <select
          id="history-outcome-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 text-xs bg-background border border-border rounded-lg px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All Outcomes' : s}
            </option>
          ))}
        </select>
        <div className="ml-auto text-xs text-muted-foreground tabular-nums">
          Showing {filteredHistory.length} of {history.length} records
        </div>
      </div>

      <DataTable
        isLoading={isLoading}
        emptyMessage="You have not checked any certificates yet."
        data={filteredHistory}
        columns={columns}
        searchPlaceholder="Search history by credential number or reason..."
        searchFilter={(h, q) =>
          (h.credentialNumber?.toLowerCase() || '').includes(q) ||
          (h.reason?.toLowerCase() || '').includes(q)
        }
      />

      {isEmpty && (
        <div className="flex justify-center">
          <Button asChild size="sm" className="gap-2 h-9">
            <Link to="/verifier">
              <ArrowLeft className="w-3.5 h-3.5" />
              Check a certificate
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};
