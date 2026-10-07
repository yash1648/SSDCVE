import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { issuerApi } from '../lib/api';
import { AppShell } from '../components/layout/AppShell';
import { IssuerOnboardingCard } from '../components/issuer/IssuerOnboardingCard';
import { SigningKeysCard } from '../components/issuer/SigningKeysCard';
import { IssueCredentialWizard } from '../components/issuer/IssueCredentialWizard';
import { IssuerCredentialDetail } from '../components/issuer/IssuerCredentialDetail';
import { VerificationsActivityTable } from '../components/issuer/VerificationsActivityTable';
import { DataTable, type Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { DateTime } from '../components/common/DateTime';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import {
  FileText,
  PlusCircle,
  KeyRound,
  Activity,
  FileCheck2,
} from 'lucide-react';
import type { IssuerCredential } from '../types';

type IssuerTab = 'onboarding' | 'credentials' | 'issue' | 'keys' | 'activity';

export const IssuerLanding: React.FC = () => {
  const [activeTab, setActiveTab] = useState<IssuerTab>('onboarding');
  const [selectedCredential, setSelectedCredential] = useState<IssuerCredential | null>(null);

  // Fetch Issuer Profile with skeleton loading
  const {
    data: profile,
    isLoading: loadingProfile,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['issuer-me'],
    queryFn: async () => {
      try {
        return await issuerApi.getMe();
      } catch (err: any) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
    staleTime: 0,
    retry: false,
  });

  const isVerified = !!profile?.verified;

  // Fetch Credentials (only when verified)
  const {
    data: credentials = [],
    refetch: refetchCredentials,
    isFetching: fetchingCredentials,
  } = useQuery({
    queryKey: ['issuer-credentials'],
    queryFn: issuerApi.getCredentials,
    enabled: isVerified,
    staleTime: 0,
  });

  // Fetch Activity Log (only when verified)
  const {
    data: verifications = [],
    isFetching: fetchingVerifications,
  } = useQuery({
    queryKey: ['issuer-verifications'],
    queryFn: issuerApi.getVerifications,
    enabled: isVerified,
    staleTime: 0,
  });

  const openDocumentModal = useCallback((credId: string) => {
    refetchCredentials();
    issuerApi.getCredential(credId).then(setSelectedCredential);
  }, [refetchCredentials]);

  const handleRefetchCredentials = useCallback(() => {
    refetchCredentials();
  }, [refetchCredentials]);

  const handleCredentialRowClick = useCallback((credential: IssuerCredential) => {
    issuerApi.getCredential(credential.id).then(setSelectedCredential);
  }, []);

  // Credential Table Columns (inside component to access setSelectedCredential)
  const credentialColumns: Column<IssuerCredential>[] = [
    {
      key: 'credentialNumber',
      header: 'Credential Number',
      sortable: true,
      accessor: (c) => (
        <span className="font-mono font-bold text-xs text-foreground">
          {c.credentialNumber}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Title / Subject',
      sortable: true,
      accessor: (c) => (
        <div>
          <div className="font-semibold text-foreground text-sm">{c.title}</div>
          <div className="text-xs text-muted-foreground">{c.subjectName}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      accessor: (c) => (
        <span className="text-xs font-medium text-muted-foreground">{c.type}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: 'anchor',
      header: 'Record',
      accessor: (c) =>
        c.anchorTxHash ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            #{c.anchorBlockNumber}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        ),
    },
    {
      key: 'issuedAt',
      header: 'Issued At',
      sortable: true,
      accessor: (c) => <DateTime value={c.issuedAt} />,
    },
  ];

  // Skeleton for profile loading
  if (loadingProfile) {
    return (
      <AppShell title="Institutional Issuer Portal">
        <div className="space-y-6">
          <Card className="border-border bg-card/80 shadow-sm max-w-xl mx-auto">
            <CardHeader className="py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardHeader>
          </Card>
          <div className="grid gap-4 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="border-border">
                <CardContent className="pt-6">
                  <Skeleton className="h-8 w-24 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  // Always show Onboarding tab, conditionally show others
  const tabs: { value: IssuerTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { value: 'onboarding', label: 'Onboarding', icon: <FileCheck2 className="w-3.5 h-3.5" /> },
  ];

  if (isVerified) {
    tabs.push(
      { value: 'credentials', label: 'Credentials', icon: <FileText className="w-3.5 h-3.5" />, count: credentials.length },
      { value: 'issue', label: 'Issue', icon: <PlusCircle className="w-3.5 h-3.5" /> },
      { value: 'keys', label: 'Keys', icon: <KeyRound className="w-3.5 h-3.5" /> },
      { value: 'activity', label: 'Activity', icon: <Activity className="w-3.5 h-3.5" />, count: verifications.length }
    );
  }

  const issuerProfile = profile ?? null;

  return (
    <AppShell title="Institutional Issuer Portal">
      <div className="space-y-6">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as IssuerTab)}
          className="space-y-6"
        >
          <TabsList className="bg-muted/70 p-1 rounded-xl">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-2 text-xs font-semibold"
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span className="text-xs text-muted-foreground ml-1">({tab.count})</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Onboarding Tab - Always visible */}
          <TabsContent value="onboarding" className="space-y-4">
            <IssuerOnboardingCard
              issuerProfile={issuerProfile}
              onRegistered={refetchProfile}
            />
          </TabsContent>

          {/* Credentials Tab - Visible when verified */}
          {isVerified && (
            <TabsContent value="credentials" className="space-y-4">
              <DataTable
                data={credentials}
                columns={credentialColumns}
                isLoading={fetchingCredentials && credentials.length === 0}
                searchPlaceholder="Search credentials by title, number, or recipient..."
                emptyMessage="Nothing issued yet. Issue your first certificate from the Issue tab."
                searchFilter={(c, q) =>
                  c.title.toLowerCase().includes(q) ||
                  c.credentialNumber.toLowerCase().includes(q) ||
                  c.subjectName.toLowerCase().includes(q)
                }
                onRowClick={handleCredentialRowClick}
              />
            </TabsContent>
          )}

          {/* Issue Tab - Visible when verified */}
          {isVerified && (
            <TabsContent value="issue" className="space-y-4">
              <IssueCredentialWizard
                onSuccess={handleRefetchCredentials}
                onAttachDocument={openDocumentModal}
              />
            </TabsContent>
          )}

          {/* Keys Tab - Visible when verified */}
          {isVerified && (
            <TabsContent value="keys" className="space-y-4">
              <SigningKeysCard isVerifiedIssuer={true} />
            </TabsContent>
          )}

          {/* Activity Tab - Visible when verified */}
          {isVerified && (
            <TabsContent value="activity" className="space-y-4">
              <VerificationsActivityTable records={verifications} isLoading={fetchingVerifications && verifications.length === 0} />
            </TabsContent>
          )}
        </Tabs>

        {/* Credential Details Modal */}
        {selectedCredential && (
          <IssuerCredentialDetail
            credential={selectedCredential}
            onRefresh={() => {
              refetchCredentials();
              issuerApi.getCredential(selectedCredential.id).then(setSelectedCredential);
            }}
            onClose={() => setSelectedCredential(null)}
          />
        )}
      </div>
    </AppShell>
  );
};