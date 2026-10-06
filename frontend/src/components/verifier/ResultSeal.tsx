import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Clock, FileQuestion, WifiOff } from 'lucide-react';
import type { VerificationStatus } from '../../types/verifier';

const SEAL: Record<VerificationStatus, { icon: React.ReactNode; title: string; tone: string; next: string }> = {
  VALID: { icon: <ShieldCheck className="w-8 h-8" />, title: 'Genuine certificate', tone: 'text-primary border-primary/30 bg-primary/5', next: 'You can rely on this record.' },
  TAMPERED: { icon: <ShieldAlert className="w-8 h-8" />, title: 'Changed since issue', tone: 'text-destructive border-destructive/30 bg-destructive/5', next: 'Ask the issuer for a fresh copy.' },
  REVOKED: { icon: <ShieldX className="w-8 h-8" />, title: 'Withdrawn by issuer', tone: 'text-destructive border-destructive/30 bg-destructive/5', next: 'Contact the issuing institution.' },
  EXPIRED: { icon: <Clock className="w-8 h-8" />, title: 'Past its validity', tone: 'text-accent border-accent/30 bg-accent/5', next: 'Ask whether a renewal exists.' },
  NOT_FOUND: { icon: <FileQuestion className="w-8 h-8" />, title: 'No matching record', tone: 'text-muted-foreground border-border bg-muted/40', next: 'Check the reference and try again.' },
  UNAVAILABLE: { icon: <WifiOff className="w-8 h-8" />, title: 'Check unavailable', tone: 'text-muted-foreground border-border bg-muted/40', next: 'Try again in a moment.' },
};

export const ResultSeal: React.FC<{ status: VerificationStatus; reason: string }> = ({ status, reason }) => {
  const s = SEAL[status];
  return (
    <div className={`rounded-xl border p-6 text-center space-y-2 ${s.tone}`}>
      <div className="flex justify-center">{s.icon}</div>
      <h2 className="font-display text-2xl font-bold tracking-tight">{s.title}</h2>
      <p className="text-sm">{reason}</p>
      <p className="text-sm font-semibold">{s.next}</p>
    </div>
  );
};
