import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Wallet, Loader2, AlertCircle } from 'lucide-react';
import { holderApi } from '../../lib/api';
import { toast } from 'sonner';

interface AddToWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const AddToWalletModal: React.FC<AddToWalletModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [credentialId, setCredentialId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = credentialId.trim();
    if (!trimmed) {
      setError('Please provide a credential ID.');
      return;
    }

    if (!UUID_REGEX.test(trimmed)) {
      setError('That ID does not look right. It should match the format below.');
      return;
    }

    setIsSubmitting(true);
    try {
      await holderApi.addToWallet(trimmed);
      toast.success('Credential added to your wallet.');
      setCredentialId('');
      onOpenChange(false);
      onSuccess();
    } catch {
      setError('Could not add it. Check the ID and make sure it belongs to you.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-primary mb-1">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg">Add Credential to Wallet</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Paste the credential ID shared with you by your institution.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="credIdInput">Credential ID</Label>
            <Input
              id="credIdInput"
              placeholder="e.g. e5b2a0c4-1234-5678-90ab-cdef12345678"
              value={credentialId}
              onChange={(e) => {
                setCredentialId(e.target.value);
                if (error) setError(null);
              }}
              className="font-mono text-xs"
              autoFocus
            />
            {error && (
              <div role="alert" className="flex items-center gap-1.5 text-xs text-destructive pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2 font-semibold">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add to Wallet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};