import React, { useState } from 'react';
import { Search, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { HashDisplay } from '../common/HashDisplay';
import { verifierApi } from '../../lib/api';
import type { AnchorLookup } from '../../types/verifier';
import { GlossaryTerm } from './GlossaryTerm';
import { ResultSeal } from './ResultSeal';

// Lookup by credential number. A miss renders the NOT_FOUND seal,
// never a bare error line.
export const AnchorLookupSection: React.FC = () => {
  const [credentialNumber, setCredentialNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [anchorData, setAnchorData] = useState<AnchorLookup | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = credentialNumber.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setNotFound(false);
    setAnchorData(null);

    try {
      setAnchorData(await verifierApi.getAnchor(trimmed));
    } catch {
      setNotFound(true);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-primary" aria-hidden="true" />
            Look up a certificate
          </CardTitle>
          <CardDescription>
            Enter the credential number to see its chain record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup} className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Input
                value={credentialNumber}
                onChange={(e) => setCredentialNumber(e.target.value)}
                placeholder="e.g. SSD-CVE-2026-EC47D3"
                className="font-mono"
                aria-label="Credential number"
              />
            </div>
            <Button type="submit" disabled={isSearching || !credentialNumber.trim()}>
              {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSearching ? 'Looking up...' : 'Look up'}
            </Button>
          </form>

          {notFound && (
            <div className="mt-4">
              <ResultSeal status="NOT_FOUND" reason="No matching record for this credential number." />
            </div>
          )}
        </CardContent>
      </Card>

      {anchorData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="font-mono text-base font-semibold">
                {anchorData.credentialNumber}
              </CardTitle>
              <CardDescription>Chain record for this certificate</CardDescription>
            </div>
            {anchorData.anchorVerified ? (
              <Badge variant="outline" className="gap-1">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Record matches
              </Badge>
            ) : (
              <Badge variant="outline">Record differs</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="block text-[11px] text-muted-foreground">Content hash</span>
                <GlossaryTerm term="contentHash">
                  <HashDisplay value={anchorData.contentHash} truncateLength={8} />
                </GlossaryTerm>
              </div>
              <div>
                <span className="block text-[11px] text-muted-foreground">Transaction hash</span>
                <GlossaryTerm term="txHash">
                  <HashDisplay value={anchorData.txHash} truncateLength={8} />
                </GlossaryTerm>
              </div>
              <div>
                <span className="block text-[11px] text-muted-foreground">Block</span>
                <span className="font-mono font-semibold tabular-nums">
                  {anchorData.blockNumber ?? '-'}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-muted-foreground">Chain</span>
                <span className="font-mono font-semibold tabular-nums">
                  {anchorData.chainId}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
