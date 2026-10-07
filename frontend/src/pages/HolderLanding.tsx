import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { holderApi } from '../lib/api';
import { AppShell } from '../components/layout/AppShell';
import { CredentialManageModal } from '../components/holder/CredentialManageModal';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { HashDisplay } from '../components/common/HashDisplay';
import { DateTime } from '../components/common/DateTime';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Wallet,
  Plus,
  Search,
  Building2,
  Trash2,
  RefreshCw,
  QrCode,
  Download,
  Lock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { WalletCredential } from '../types';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const HolderLanding: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [addCredentialInput, setAddCredentialInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  // Shared wallet links prefill the add field; adding always needs a click.
  useEffect(() => {
    const add = searchParams.get('add');
    if (add) setAddCredentialInput(add);
  }, [searchParams]);
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [manageTarget, setManageTarget] = useState<{
    cred: WalletCredential;
    tab: 'privacy' | 'share' | 'download';
  } | null>(null);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<Record<string, boolean>>({});
  const [isRemoving, setIsRemoving] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'REVOKED'>('ALL');

  // Query wallet
  const {
    data: credentials = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['holder-wallet'],
    queryFn: holderApi.getWallet,
    staleTime: 0,
  });

  const filteredCredentials = useMemo(() => {
    return credentials.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          c.title.toLowerCase().includes(q) ||
          c.credentialNumber.toLowerCase().includes(q) ||
          c.issuerName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [credentials, searchQuery, statusFilter]);

  const handleAddById = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAddError(null);

    const trimmed = addCredentialInput.trim();
    if (!trimmed) {
      setAddError('Please enter the credential ID shared by your institution.');
      return;
    }

    if (!UUID_REGEX.test(trimmed)) {
      setAddError('Credential ID must be a valid UUID.');
      return;
    }

    setIsAddingWallet(true);
    try {
      const added = await holderApi.addToWallet(trimmed);
      toast.success(`"${added.title}" is now in your wallet.`);
      setAddCredentialInput('');
      refetch();
    } catch {
      setAddError('Could not add it. Check the ID and try again.');
    } finally {
      setIsAddingWallet(false);
    }
  };

  return (
    <AppShell title="Student Credential Wallet">
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
              My certificates
            </h2>
            <p className="text-xs text-muted-foreground">
              Your personal wallet for every certificate issued to you.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2 h-9"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {isFetching ? (
                <span className="w-16 h-4 bg-muted animate-pulse rounded" />
              ) : (
                'Refresh'
              )}
            </Button>
          </div>
        </div>

        {/* Quick Add by UUID Bar */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <label className="text-xs font-semibold text-foreground">
            Add a certificate:
          </label>
          <form onSubmit={handleAddById} className="flex gap-2">
            <Input
              placeholder="Enter the credential ID shared by your institution…"
              value={addCredentialInput}
              onChange={(e) => {
                setAddCredentialInput(e.target.value);
                if (addError) setAddError(null);
              }}
              className="font-mono text-xs flex-1"
              aria-describedby={addError ? 'add-error' : undefined}
              aria-invalid={!!addError}
            />
            <Button
              type="submit"
              disabled={isAddingWallet || !addCredentialInput.trim()}
              className="gap-2 shrink-0 font-semibold text-xs h-9"
            >
              {isAddingWallet ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Add to Wallet
            </Button>
          </form>
          {addError && (
            <div id="add-error" role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{addError}</span>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card border border-border rounded-xl">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, number, or institution..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground font-medium">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-9 text-xs bg-background border border-border rounded-lg px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Credentials</option>
              <option value="ACTIVE">Active Only</option>
              <option value="REVOKED">Revoked</option>
            </select>
          </div>
        </div>

        {/* Cards Section */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading credentials">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-56 rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="h-4 w-1/3 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-3/4 bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-8 w-full bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : credentials.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No Credentials Yet"
            description="No credentials yet. Ask your institution to issue one, or add it below with its credential ID."
            actionLabel="Add Credential"
            onAction={() => {
              const input = document.querySelector<HTMLInputElement>('input[placeholder*="credential ID"]');
              input?.focus();
            }}
          />
        ) : (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-foreground">My Credential Cards</h3>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCredentials.map((c) => (
                <div
                  key={c.credentialId}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-muted-foreground">
                        {c.credentialNumber}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-foreground line-clamp-1">
                        {c.title}
                      </h4>
                      <p className="text-xs text-muted-foreground pt-0.5 font-medium">
                        {c.type}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/60">
                      <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate font-semibold text-foreground">
                        {c.issuerName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Conferred:</span>
                      <DateTime value={c.issuedAt} showTime={false} />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Record:</span>
                      <HashDisplay value={c.anchorTxHash} truncateLength={5} />
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="space-y-2 pt-3 border-t border-border/60">
                    <div className="grid grid-cols-3 gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManageTarget({ cred: c, tab: 'privacy' })}
                        className="text-xs h-8 px-2 gap-1 font-medium"
                        title="Selective Disclosure"
                      >
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Privacy</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManageTarget({ cred: c, tab: 'share' })}
                        className="text-xs h-8 px-2 gap-1 font-medium"
                      >
                        <QrCode className="w-3.5 h-3.5 shrink-0" />
                        Share
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManageTarget({ cred: c, tab: 'download' })}
                        className="text-xs h-8 px-2 gap-1 font-semibold"
                      >
                        <Download className="w-3.5 h-3.5 shrink-0" />
                        Files
                      </Button>
                    </div>

                    {/* Remove from Wallet */}
                    <div className="pt-1 flex items-center justify-center">
                      {!confirmingRemoveId[c.credentialId] ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setConfirmingRemoveId((prev) => ({ ...prev, [c.credentialId]: true }))
                          }
                          className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs h-7 gap-1.5 transition-all duration-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove from wallet
                        </Button>
                      ) : (
                        <div className="flex w-full items-center justify-between p-1.5 rounded-lg border border-destructive/40 bg-destructive/5 text-xs">
                          <span className="text-destructive font-medium">Remove?</span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setConfirmingRemoveId((prev) => ({ ...prev, [c.credentialId]: false }))
                              }
                              className="h-6 px-2 text-[11px]"
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isRemoving}
                              onClick={async () => {
                                setIsRemoving(true);
                                try {
                                  await holderApi.removeFromWallet(c.credentialId);
                                  toast.success(`Removed ${c.title} from wallet.`);
                                  refetch();
                                } catch {
                                  toast.error('Failed to remove credential.');
                                } finally {
                                  setIsRemoving(false);
                                  setConfirmingRemoveId((prev) => ({
                                    ...prev,
                                    [c.credentialId]: false,
                                  }));
                                }
                              }}
                              className="h-6 px-2 text-[11px] font-bold"
                            >
                              Confirm
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manage Modal (Files, Privacy, Share) */}
        {manageTarget && (
          <CredentialManageModal
            credential={manageTarget.cred}
            initialTab={manageTarget.tab}
            onClose={() => setManageTarget(null)}
          />
        )}
      </div>
    </AppShell>
  );
};