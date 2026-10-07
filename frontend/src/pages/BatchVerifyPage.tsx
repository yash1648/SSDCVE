import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BatchVerifySection } from '../components/verifier/BatchVerifySection';

export const BatchVerifyPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-6xl py-10 px-4 sm:px-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" aria-hidden />
            Batch check
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Check many certificates
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Upload several certificate files at once and get a result for each, with a CSV report you can keep.
          </p>
        </div>

        <Button variant="outline" size="sm" asChild className="gap-2 self-start sm:self-auto font-semibold">
          <Link to="/verify">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Single check
          </Link>
        </Button>
      </div>

      <BatchVerifySection />
    </div>
  );
};
