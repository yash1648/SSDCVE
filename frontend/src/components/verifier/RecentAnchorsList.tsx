import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { verifierApi } from '../../lib/api';
import type { RecentAnchor } from '../../types/verifier';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

const formatUtc = (value: string): string => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'date unavailable';
  return (
    d.toLocaleString('en-GB', {
      timeZone: 'UTC',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' UTC'
  );
};

// Latest records from the chain. Loads once on mount; an empty
// result or a failed load shows a quiet empty state, never an error wall.
export const RecentAnchorsList: React.FC = () => {
  const [recent, setRecent] = useState<RecentAnchor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setRecent(await verifierApi.getRecentAnchors(20));
      } catch {
        setRecent([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent anchors</CardTitle>
        <CardDescription>Latest records from the public chain</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading recent records">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No recent records found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credential number</TableHead>
                <TableHead>Issuer</TableHead>
                <TableHead>Block</TableHead>
                <TableHead>Time (UTC)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((r, i) => (
                <TableRow key={`${r.credentialNumber}-${i}`}>
                  <TableCell className="font-mono text-sm">{r.credentialNumber}</TableCell>
                  <TableCell>{r.issuerName}</TableCell>
                  <TableCell className="tabular-nums">{r.blockNumber ?? '-'}</TableCell>
                  <TableCell className="tabular-nums">{formatUtc(r.anchoredAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
