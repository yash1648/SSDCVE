import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Eye, EyeOff, Loader2, Save, Info } from 'lucide-react';
import { holderApi } from '../../lib/api';
import { toast } from 'sonner';
import type { DisclosureData } from '../../types';

interface SelectiveDisclosurePanelProps {
  credentialId: string;
}

export const SelectiveDisclosurePanel: React.FC<SelectiveDisclosurePanelProps> = ({
  credentialId,
}) => {
  const [data, setData] = useState<DisclosureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const loadDisclosure = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await holderApi.getDisclosure(credentialId);
      setData(res);
      setHiddenSet(new Set(res.hiddenClaims || []));
    } catch {
      toast.error('Could not load privacy settings for this credential.');
    } finally {
      setLoading(false);
    }
  }, [credentialId]);

  useEffect(() => {
    loadDisclosure();
  }, [loadDisclosure]);

  const toggleClaim = async (claimKey: string) => {
    const nextSet = new Set(hiddenSet);
    if (nextSet.has(claimKey)) {
      nextSet.delete(claimKey);
    } else {
      nextSet.add(claimKey);
    }
    setHiddenSet(nextSet);
    setIsSaving(true);
    try {
      const updated = await holderApi.updateDisclosure(credentialId, {
        hiddenClaims: Array.from(nextSet),
      });
      setData(updated);
      setHiddenSet(new Set(updated.hiddenClaims || []));
      toast.success('Privacy settings updated');
    } catch {
      toast.error('Failed to update privacy settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await holderApi.updateDisclosure(credentialId, {
        hiddenClaims: Array.from(hiddenSet),
      });
      setData(updated);
      setHiddenSet(new Set(updated.hiddenClaims || []));
      toast.success('Privacy & selective disclosure settings saved!');
    } catch {
      toast.error('Failed to update privacy settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 border border-border rounded-xl flex items-center justify-center text-xs text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>Loading privacy settings…</span>
      </div>
    );
  }

  if (!data || !data.claims || Object.keys(data.claims).length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-6 text-center text-xs text-muted-foreground">
          No details available for this certificate.
        </CardContent>
      </Card>
    );
  }

  const claimEntries = Object.entries(data.claims);
  const totalClaims = claimEntries.length;
  const sharedCount = totalClaims - hiddenSet.size;

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-primary" />
            <CardTitle className="text-base font-semibold">Privacy</CardTitle>
          </div>
          <CardDescription className="text-xs pt-0.5">
            Decide which details checkers can see and which stay hidden.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border-primary/20"
          >
            {sharedCount} of {totalClaims} details shared
          </Badge>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5 font-semibold"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Privacy
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Informative Helper Text */}
        <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground flex items-start gap-2.5 border border-border/60">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>
            Hidden details stay private. When an employer checks this certificate, hidden details appear redacted as <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">••••••••</code> and the certificate stays verifiable.
          </span>
        </div>

        {/* Claims List with Toggle Switch */}
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
          {claimEntries.map(([key, val]) => {
            const isHidden = hiddenSet.has(key);
            const displayValue = String(val);

            return (
              <div
                key={key}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground font-mono uppercase tracking-wider">
                      {key}
                    </span>
                    {isHidden ? (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                        Hidden
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                        Shared
                      </span>
                    )}
                  </div>
                  <div className="text-xs">
                    {isHidden ? (
                      <span className="font-mono text-muted-foreground select-none">
                        ••••••••••••
                      </span>
                    ) : (
                      <span className="text-foreground font-medium">{displayValue}</span>
                    )}
                  </div>
                </div>

                <Button
                  data-claim-toggle={key}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleClaim(key)}
                  className={`text-xs h-7 px-2.5 gap-1.5 self-start sm:self-auto ${
                    isHidden
                      ? 'text-foreground hover:bg-muted'
                      : 'text-amber-600 hover:text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                  }`}
                >
                  {isHidden ? (
                    <>
                      <Eye className="w-3.5 h-3.5" /> Reveal Claim
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" /> Redact / Hide
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Live Verifier Preview */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t">
          <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
            <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 block mb-1.5">
              Verifier Will See:
            </span>
            <ul className="space-y-1 text-xs text-foreground font-mono">
              {claimEntries
                .filter(([k]) => !hiddenSet.has(k))
                .map(([k, v]) => (
                  <li key={k} className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{k}:</span>
                    <span>{String(v)}</span>
                  </li>
                ))}
              {sharedCount === 0 && (
                <li className="text-muted-foreground italic text-[11px]">No claims disclosed</li>
              )}
            </ul>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
            <span className="font-semibold text-xs text-rose-500 block mb-1.5">
              Verifier Won't See:
            </span>
            <ul className="space-y-1 text-xs text-muted-foreground font-mono">
              {claimEntries
                .filter(([k]) => hiddenSet.has(k))
                .map(([k]) => (
                  <li key={k} className="flex items-center gap-1.5">
                    <span>{k}:</span>
                    <span>••••••••</span>
                  </li>
                ))}
              {hiddenSet.size === 0 && (
                <li className="text-muted-foreground italic text-[11px]">All claims are visible</li>
              )}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
