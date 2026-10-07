import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Users, Building2, Clock, Activity } from 'lucide-react';
import type { AdminUserResponse, AdminIssuerResponse, AdminVerificationResponse } from '../../types';

interface AdminStatsCardsProps {
  users: AdminUserResponse[];
  issuers: AdminIssuerResponse[];
  verifications: AdminVerificationResponse[];
  isLoading?: boolean;
}

const StatCardSkeleton: React.FC = () => (
  <Card className="border-border shadow-sm" aria-busy="true">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="w-8 h-8 rounded-lg" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-28 mt-2" />
    </CardContent>
  </Card>
);

export const AdminStatsCards: React.FC<AdminStatsCardsProps> = ({
  users,
  issuers,
  verifications,
  isLoading = false,
}) => {
  const pendingApprovalsCount = issuers.filter((i) => !i.verified).length;

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="Loading statistics">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Users
          </CardTitle>
          <div className="w-8 h-8 rounded-lg bg-muted text-foreground flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground tabular-nums">{users.length}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Accounts on the platform
          </p>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Institutions
          </CardTitle>
          <div className="w-8 h-8 rounded-lg bg-muted text-foreground flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground tabular-nums">{issuers.length}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Institutions, approved and waiting
          </p>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pending Approvals
          </CardTitle>
          <div className="w-8 h-8 rounded-lg bg-muted text-foreground flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-accent tabular-nums">{pendingApprovalsCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Institutions waiting for review
          </p>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Checks
          </CardTitle>
          <div className="w-8 h-8 rounded-lg bg-muted text-foreground flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground tabular-nums">{verifications.length}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Certificate checks performed
          </p>
        </CardContent>
      </Card>
    </div>
  );
};