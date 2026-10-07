import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { AppShell } from '../components/layout/AppShell';
import { AdminStatsCards } from '../components/admin/AdminStatsCards';
import { AdminCharts } from '../components/admin/AdminCharts';
import { UsersTable } from '../components/admin/UsersTable';
import { IssuersTable } from '../components/admin/IssuersTable';
import { VerificationsAuditTable } from '../components/admin/VerificationsAuditTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { RefreshCw, LayoutDashboard, Users, Building2, Activity } from 'lucide-react';

type AdminTab = 'overview' | 'issuers' | 'users' | 'audit';

const tabFromPath = (pathname: string): AdminTab => {
  const seg = pathname.replace(/^\/admin\/?/, '');
  if (seg === 'users') return 'users';
  if (seg === 'issuers') return 'issuers';
  if (seg === 'verifications') return 'audit';
  return 'overview';
};

export const AdminLanding: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>(() => tabFromPath(location.pathname));

  React.useEffect(() => {
    setActiveTab(tabFromPath(location.pathname));
  }, [location.pathname]);

  const showTab = (tab: AdminTab) => {
    setActiveTab(tab);
    navigate(
      tab === 'overview'
        ? '/admin'
        : tab === 'audit'
          ? '/admin/verifications'
          : `/admin/${tab}`
    );
  };

  const {
    data: users = [],
    refetch: refetchUsers,
    isFetching: fetchingUsers,
  } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.getUsers,
    staleTime: 0,
  });

  const {
    data: issuers = [],
    refetch: refetchIssuers,
    isFetching: fetchingIssuers,
  } = useQuery({
    queryKey: ['admin-issuers'],
    queryFn: adminApi.getIssuers,
    staleTime: 0,
  });

  const {
    data: verifications = [],
    refetch: refetchVerifications,
    isFetching: fetchingVerifications,
  } = useQuery({
    queryKey: ['admin-verifications'],
    queryFn: adminApi.getVerifications,
    staleTime: 0,
  });

  const isRefreshing = fetchingUsers || fetchingIssuers || fetchingVerifications;

  const handleRefreshAll = () => {
    refetchUsers();
    refetchIssuers();
    refetchVerifications();
  };

  const pendingIssuersCount = issuers.filter((i) => !i.verified).length;

  return (
    <AppShell title="Platform Administration">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Platform Administration
            </h2>
            <p className="text-sm text-muted-foreground">
              Approve institutions, manage accounts, and review checking activity.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="gap-2 self-start sm:self-auto h-9"
            aria-busy={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Skeleton className="w-3.5 h-3.5 rounded-full" aria-hidden="true" />
                <Skeleton className="w-20 h-5" aria-hidden="true" />
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Data
              </>
            )}
          </Button>
        </div>

        <AdminStatsCards
          users={users}
          issuers={issuers}
          verifications={verifications}
          isLoading={fetchingUsers && fetchingIssuers && fetchingVerifications && users.length === 0 && issuers.length === 0 && verifications.length === 0}
        />

        <Tabs value={activeTab} onValueChange={(v) => showTab(v as AdminTab)} className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl" role="tablist" aria-label="Admin sections">
            <TabsTrigger value="overview" className="gap-2 text-xs font-semibold">
              <LayoutDashboard className="w-3.5 h-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="issuers" className="gap-2 text-xs font-semibold relative">
              <Building2 className="w-3.5 h-3.5" />
              Issuers Queue
              {pendingIssuersCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-accent absolute -top-0.5 -right-0.5" role="status" aria-label={`${pendingIssuersCount} pending`} />
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2 text-xs font-semibold">
              <Users className="w-3.5 h-3.5" />
              User Directory
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2 text-xs font-semibold">
              <Activity className="w-3.5 h-3.5" />
              Verification Audit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AdminCharts users={users} verifications={verifications} isLoading={fetchingUsers || fetchingVerifications} />
          </TabsContent>

          <TabsContent value="issuers" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Institutions waiting for review</h3>
              <p className="text-xs text-muted-foreground">
                Approve institutions so they can start issuing certificates.
              </p>
            </div>
            <IssuersTable issuers={issuers} onRefresh={refetchIssuers} isLoading={fetchingIssuers && issuers.length === 0} />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Accounts</h3>
              <p className="text-xs text-muted-foreground">
                Grant staff accounts the ability to register an institution.
              </p>
            </div>
            <UsersTable users={users} onRefresh={refetchUsers} isLoading={fetchingUsers && users.length === 0} />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Checking activity</h3>
              <p className="text-xs text-muted-foreground">
                Every certificate check performed across the platform.
              </p>
            </div>
            <VerificationsAuditTable verifications={verifications} isLoading={fetchingVerifications && verifications.length === 0} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};