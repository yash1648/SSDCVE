import React from 'react';
import { DataTable, type Column } from '../common/DataTable';
import { DateTime } from '../common/DateTime';
import { StatusBadge } from '../common/StatusBadge';
import type { IssuerVerificationRecord } from '../../types';

interface VerificationsActivityTableProps {
  records: IssuerVerificationRecord[];
  isLoading?: boolean;
}

export const VerificationsActivityTable: React.FC<VerificationsActivityTableProps> = ({
  records,
  isLoading = false,
}) => {
  const columns: Column<IssuerVerificationRecord>[] = [
    {
      key: 'credentialNumber',
      header: 'Credential Number',
      sortable: true,
      accessor: (r) => (
        <span className="font-mono font-semibold text-xs text-foreground">
          {r.credentialNumber}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Current Status',
      sortable: true,
      accessor: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'reason',
      header: 'Note',
      accessor: (r) => (
        <span className="text-xs text-muted-foreground truncate max-w-xs block">
          {r.reason || 'Active and in good standing'}
        </span>
      ),
    },
    {
      key: 'issuedAt',
      header: 'Issued At',
      sortable: true,
      accessor: (r) => <DateTime value={r.issuedAt} />,
    },
    {
      key: 'revokedAt',
      header: 'Revoked At',
      sortable: true,
      accessor: (r) => (r.revokedAt ? <DateTime value={r.revokedAt} /> : '-'),
    },
  ];

  return (
    <DataTable
      isLoading={isLoading}
      emptyMessage="No checking activity on your certificates yet."
      data={records}
      columns={columns}
      searchPlaceholder="Search credential activity..."
      searchFilter={(r, q) =>
        r.credentialNumber.toLowerCase().includes(q) ||
        (r.reason?.toLowerCase() || '').includes(q)
      }
    />
  );
};
