import React, { useState, useMemo } from 'react';
import { DataTable, type Column } from '../common/DataTable';
import { DateTime } from '../common/DateTime';
import { ShieldCheck, ShieldAlert, ShieldX, Clock, FileQuestion, WifiOff } from 'lucide-react';
import type { AdminVerificationResponse } from '../../types/admin';

type VerificationStatus = AdminVerificationResponse['result'];

const SEAL_CHIP: Record<VerificationStatus, { icon: React.ReactNode; label: string; tone: string }> = {
  VALID: { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: 'Valid', tone: 'bg-primary/10 text-primary border-primary/20' },
  TAMPERED: { icon: <ShieldAlert className="w-3.5 h-3.5" />, label: 'Tampered', tone: 'bg-destructive/10 text-destructive border-destructive/20' },
  REVOKED: { icon: <ShieldX className="w-3.5 h-3.5" />, label: 'Revoked', tone: 'bg-destructive/10 text-destructive border-destructive/20' },
  EXPIRED: { icon: <Clock className="w-3.5 h-3.5" />, label: 'Expired', tone: 'bg-accent/10 text-accent border-accent/20' },
  NOT_FOUND: { icon: <FileQuestion className="w-3.5 h-3.5" />, label: 'Not Found', tone: 'bg-muted/40 text-muted-foreground border-border' },
  UNAVAILABLE: { icon: <WifiOff className="w-3.5 h-3.5" />, label: 'Unavailable', tone: 'bg-muted/40 text-muted-foreground border-border' },
};

const ResultSealChip: React.FC<{ status: VerificationStatus }> = ({ status }) => {
  const s = SEAL_CHIP[status] || SEAL_CHIP.NOT_FOUND;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${s.tone}`}>
      {s.icon}
      <span>{s.label}</span>
    </span>
  );
};

interface VerificationsAuditTableProps {
  verifications: AdminVerificationResponse[];
  isLoading?: boolean;
}

export const VerificationsAuditTable: React.FC<VerificationsAuditTableProps> = ({
  verifications,
  isLoading = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const filteredVerifications = useMemo(() => {
    return verifications.filter((v) => {
      if (statusFilter !== 'ALL' && v.result !== statusFilter) {
        return false;
      }
      if (startDate) {
        const vDate = new Date(v.verifiedAt).getTime();
        const start = new Date(startDate).getTime();
        if (vDate < start) return false;
      }
      if (endDate) {
        const vDate = new Date(v.verifiedAt).getTime();
        const end = new Date(endDate).getTime() + 86400000;
        if (vDate > end) return false;
      }
      return true;
    });
  }, [verifications, statusFilter, startDate, endDate]);

  const columns: Column<AdminVerificationResponse>[] = [
    {
      key: 'credentialNumber',
      header: 'Credential Number',
      sortable: true,
      accessor: (row) => (
        <span className="font-mono font-medium text-xs text-foreground tabular-nums">
          {row.credentialNumber || '—'}
        </span>
      ),
    },
    {
      key: 'result',
      header: 'Result',
      sortable: true,
      accessor: (row) => <ResultSealChip status={row.result} />,
    },
    {
      key: 'reason',
      header: 'Reason',
      accessor: (row) => (
        <span className="text-xs text-muted-foreground truncate max-w-xs block" title={row.reason || ''}>
          {row.reason || 'Verification passed'}
        </span>
      ),
    },
    {
      key: 'verifiedAt',
      header: 'Verified At (UTC)',
      sortable: true,
      accessor: (row) => <DateTime value={row.verifiedAt} />,
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 p-3 bg-card border border-border rounded-xl">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground font-medium">Status:</label>
          <select
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
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground font-medium">From:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 text-xs w-36 bg-background border border-border rounded-lg px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground font-medium">To:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 text-xs w-36 bg-background border border-border rounded-lg px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {(statusFilter !== 'ALL' || startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter('ALL');
              setStartDate('');
              setEndDate('');
            }}
            className="text-xs text-primary hover:text-primary/80 font-medium ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>

      <DataTable
        isLoading={isLoading}
        emptyMessage="No checks recorded yet."
        data={filteredVerifications}
        columns={columns}
        searchPlaceholder="Search credential number or reason..."
        searchFilter={(row, q) =>
          (row.credentialNumber?.toLowerCase() || '').includes(q) ||
          (row.reason?.toLowerCase() || '').includes(q)
        }
      />
    </div>
  );
};