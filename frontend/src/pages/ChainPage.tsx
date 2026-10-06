import React from 'react';
import { Database } from 'lucide-react';
import { ChainStatusCard } from '../components/verifier/ChainStatusCard';
import { AnchorLookupSection } from '../components/verifier/AnchorLookupSection';
import { RecentAnchorsList } from '../components/verifier/RecentAnchorsList';

// Public chain record: header plus the three chain sections.
// All data loads inside the sections on mount; no polling.
export const ChainPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-6xl space-y-6 py-10 px-4 sm:px-6">
      <div className="space-y-1 border-b border-border pb-6">
        <h1 className="flex items-center gap-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          <Database className="h-7 w-7 text-primary" aria-hidden="true" />
          Chain record
        </h1>
        <p className="text-sm text-muted-foreground">
          Every certificate recorded here, with its reference number and time.
        </p>
      </div>

      <ChainStatusCard />
      <AnchorLookupSection />
      <RecentAnchorsList />
    </div>
  );
};
