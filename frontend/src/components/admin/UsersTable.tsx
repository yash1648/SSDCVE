import React, { useState } from 'react';
import { DataTable, type Column } from '../common/DataTable';
import { DateTime } from '../common/DateTime';
import { Button } from '../ui/button';
import { UserCheck, Loader2 } from 'lucide-react';
import { adminApi } from '../../lib/api';
import { toast } from 'sonner';
import type { AdminUserResponse } from '../../types';

interface UsersTableProps {
  users: AdminUserResponse[];
  isLoading?: boolean;
  onRefresh: () => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({ users, onRefresh, isLoading = false }) => {
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const columns: Column<AdminUserResponse>[] = [
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      accessor: (user) => (
        <span className="text-muted-foreground text-xs font-mono tabular-nums">{user.email}</span>
      ),
    },
    {
      key: 'fullName',
      header: 'Full Name',
      sortable: true,
      accessor: (user) => (
        <span className="font-semibold text-foreground text-sm">{user.fullName}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      accessor: (user) => {
        const isAdmin = user.role === 'ADMIN';
        return (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              isAdmin
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-accent/30 bg-accent/10 text-accent'
            }`}
            role="status"
            aria-label={user.role}
          >
            {user.role}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Created (UTC)',
      sortable: true,
      accessor: (user) => <DateTime value={user.createdAt} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      accessor: (user) => {
        if (user.role === 'ADMIN') return null;
        const isPromoting = promotingId === user.id;
        return (
          <div className="flex justify-end">
            <Button
              variant="default"
              size="sm"
              disabled={isPromoting}
              onClick={async (e) => {
                e.stopPropagation();
                setPromotingId(user.id);
                try {
                  await adminApi.promoteIssuer(user.id);
                  toast.success(`User ${user.fullName} promoted to Issuer.`);
                  onRefresh();
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Failed to promote user to issuer.';
                  toast.error(message, { id: `promote-error-${user.id}` });
                } finally {
                  setPromotingId(null);
                }
              }}
              className="gap-1.5 h-8 px-3"
              aria-busy={isPromoting}
            >
              {isPromoting ? (
                <>
                  <Loader2 className="animate-spin w-3.5 h-3.5" aria-hidden="true" />
                  Promoting
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  Promote to Issuer
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
        emptyMessage="No accounts match."
        data={users}
        columns={columns}
        searchPlaceholder="Filter by name or email..."
        searchFilter={(user, q) =>
          user.fullName.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
        }
      />
    </>
  );
};