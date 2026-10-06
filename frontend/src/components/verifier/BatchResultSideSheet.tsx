import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { VerificationResultHero } from './VerificationResultHero';
import type { BatchItemResult } from '../../types';

interface BatchResultSideSheetProps {
  item: BatchItemResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BatchResultSideSheet: React.FC<BatchResultSideSheetProps> = ({
  item,
  open,
  onOpenChange,
}) => {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Result for <span className="font-mono text-base">{item.fileName}</span>
          </DialogTitle>
        </DialogHeader>

        {item.verificationResult ? (
          <VerificationResultHero
            result={item.verificationResult}
            checks={item.checks}
          />
        ) : (
          <div
            role="alert"
            className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive"
          >
            {item.errorMessage || 'No detailed result is available for this file.'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
