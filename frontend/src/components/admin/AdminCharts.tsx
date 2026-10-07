import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import type { AdminUserResponse, AdminVerificationResponse } from '../../types';

interface AdminChartsProps {
  users: AdminUserResponse[];
  verifications: AdminVerificationResponse[];
  isLoading?: boolean;
}

interface TimestampedItem {
  createdAt?: string;
  verifiedAt?: string;
  [key: string]: string | undefined;
}

const ChartSkeleton: React.FC = () => (
  <Card className="border-border" aria-busy="true">
    <CardHeader>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-3 w-48 mt-1" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-64 w-full" />
    </CardContent>
  </Card>
);

const formatMonth = (date: Date): string => {
  return date.toLocaleString('default', { month: 'short', year: '2-digit' });
};

const getMonthlyData = (
  items: TimestampedItem[],
  dateField: string,
  monthsBack = 12
): Array<{ month: string; count: number }> => {
  const now = new Date();
  const monthlyMap = new Map<string, number>();

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = formatMonth(d);
    monthlyMap.set(key, 0);
  }

  items.forEach((item) => {
    const date = new Date(item[dateField] as string);
    const key = formatMonth(date);
    if (monthlyMap.has(key)) {
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
    }
  });

  return Array.from(monthlyMap.entries()).map(([month, count]) => ({ month, count }));
};

export const AdminCharts: React.FC<AdminChartsProps> = ({ users, verifications, isLoading = false }) => {
  const userGrowthData = useMemo(() => getMonthlyData(users as unknown as TimestampedItem[], 'createdAt'), [users]);
  const verificationVolumeData = useMemo(() => getMonthlyData(verifications as unknown as TimestampedItem[], 'verifiedAt'), [verifications]);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2" aria-busy="true" aria-label="Loading charts">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* User Growth Line Chart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold">User Growth</CardTitle>
          <CardDescription className="text-xs">
            New accounts registered per month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userGrowthData.every((d) => d.count === 0) ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
              No user registrations recorded yet.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userGrowthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                    labelFormatter={(label) => `Month: ${label}`}
                    formatter={(value) => [Number(value) || 0, 'Users']}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Volume Bar Chart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Verification Volume</CardTitle>
          <CardDescription className="text-xs">
            Certificate checks performed per month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verificationVolumeData.every((d) => d.count === 0) ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
              No verification activity recorded yet.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={verificationVolumeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                    labelFormatter={(label) => `Month: ${label}`}
                    formatter={(value) => [Number(value) || 0, 'Checks']}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};