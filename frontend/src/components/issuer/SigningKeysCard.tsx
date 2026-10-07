import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateTime } from '@/components/common/DateTime';
import { GlossaryTerm } from '@/components/verifier/GlossaryTerm';
import { KeyRound, Plus, Loader2, AlertCircle } from 'lucide-react';
import { issuerApi } from '@/lib/api';
import { toast } from 'sonner';
import type { IssuerKey } from '@/types';

interface SigningKeysCardProps {
  isVerifiedIssuer: boolean;
}

export const SigningKeysCard: React.FC<SigningKeysCardProps> = ({ isVerifiedIssuer }) => {
  const [keys, setKeys] = useState<IssuerKey[]>(() => {
    try {
      const saved = sessionStorage.getItem('ssdcve_session_keys');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    try {
      const newKey = await issuerApi.createKey();
      const updated = [newKey, ...keys];
      setKeys(updated);
      try {
        sessionStorage.setItem('ssdcve_session_keys', JSON.stringify(updated));
      } catch {
      }
      toast.success('Signing is ready. You can issue certificates now.');
    } catch {
      toast.error('Could not set up signing. Your institution must be approved first.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Signing keys</CardTitle>
            </div>
            <CardDescription className="text-xs pt-1">
              Keys used to sign the certificates you issue.
            </CardDescription>
          </div>
          <Button
            onClick={handleGenerateKey}
            disabled={!isVerifiedIssuer || isGenerating}
            size="sm"
            className="gap-2 shrink-0 font-semibold"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create Signing Key
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-muted/50 p-3.5 flex items-start gap-3 text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
            <span>
              <strong>Good to know:</strong> keys belong to your institution. Every certificate you issue is signed with your active key.
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-sm font-semibold text-foreground">
            Your keys ({keys.length})
          </h4>
        </div>

        {keys.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-xs text-muted-foreground bg-card/40">
            No keys yet. Create one above to start issuing certificates.{' '}
            <span className="font-medium">(Keys are stored for this session only; there is no server list endpoint.)</span>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {keys.map((k) => (
              <Card key={k.keyId} className="border-border bg-card/80">
                <CardHeader className="pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-foreground tabular-nums truncate max-w-[200px]" title={k.keyId}>
                      {k.keyId}
                    </span>
                    <Badge variant={k.active ? 'success' : 'outline'} className="text-[10px] px-2 py-0.2 rounded-full">
                      {k.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Algorithm:{' '}
                      <GlossaryTerm term="issuerSignature">
                        <strong className="text-foreground">{k.algorithm || '-'}</strong>
                      </GlossaryTerm>
                    </span>
                    <span>•</span>
                    <span>Created: <DateTime value={k.createdAt} /></span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Public key
                  </label>
                  <div className="p-2.5 rounded-lg bg-muted/60 border border-border/80 font-mono text-[11px] break-all select-all text-foreground leading-relaxed">
                    {k.publicKey}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};