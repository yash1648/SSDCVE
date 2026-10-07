import React, { useState } from 'react';
import { DataTable, type Column } from '../common/DataTable';
import { DateTime } from '../common/DateTime';
import { Button } from '../ui/button';
import { CheckCircle2, Clock, Check } from 'lucide-react';
import { adminApi } from '../../lib/api';
import { toast } from 'sonner';
import type { AdminIssuerResponse } from '../../types';

interface IssuersTableProps {
  issuers: AdminIssuerResponse[];
  isLoading?: boolean;
  onRefresh: () => void;
}

export const IssuersTable: React.FC<IssuersTableProps> = ({ issuers, onRefresh, isLoading = false }) => {
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const columns: Column<AdminIssuerResponse>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      accessor: (issuer) => (
        <span className="font-semibold text-foreground text-sm">{issuer.name}</span>
      ),
    },
    {
      key: 'domain',
      header: 'Domain',
      sortable: true,
      accessor: (issuer) => (
        <span className="text-muted-foreground text-xs font-mono tabular-nums">{issuer.domain}</span>
      ),
    },
    {
      key: 'verified',
      header: 'Status',
      sortable: true,
      accessor: (issuer) =>
        issuer.verified ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"
            role="status"
            aria-label="Verified"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent px-2.5 py-0.5 text-xs font-medium"
            role="status"
            aria-label="Pending approval"
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Approval
          </span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Created (UTC)',
      sortable: true,
      accessor: (issuer) => <DateTime value={issuer.createdAt} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      accessor: (issuer) => {
        if (issuer.verified) return null;
        const isVerifying = verifyingId === issuer.id;
        return (
          <div className="flex justify-end">
            <Button
              variant="default"
              size="sm"
              disabled={isVerifying}
              onClick={async (e) => {
                e.stopPropagation();
                setVerifyingId(issuer.id);
                try {
                  await adminApi.verifyIssuer(issuer.id);
                  toast.success(`Institution "${issuer.name}" verified successfully.`);
                  onRefresh();
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Failed to verify institution.';
                  toast.error(message, { id: `verify-error-${issuer.id}` });
                } finally {
                  setVerifyingId(null);
                }
              }}
              className="gap-1.5 h-8 px-3"
              aria-busy={isVerifying}
            >
              {isVerifying ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Verifying
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Approve
                </>
              )}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        isLoading={isLoading}
        emptyMessage="No institutions waiting."
        data={issuers}
        columns={columns}
        searchPlaceholder="Search institutions by name or domain..."
        searchFilter={(issuer, q) =>
          issuer.name.toLowerCase().includes(q) || issuer.domain.toLowerCase().includes(q)
        }
      />
    </>
  );
};