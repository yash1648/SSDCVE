import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Building2, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { issuerApi } from '../../lib/api';
import type { IssuerProfile } from '../../types';

const orgSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(255, 'Max 255 characters'),
  domain: z.string().min(1, 'Domain is required').max(255, 'Max 255 characters'),
});

type OrgFormData = z.infer<typeof orgSchema>;

interface IssuerOnboardingCardProps {
  issuerProfile: IssuerProfile | null;
  onRegistered: () => void;
}

export const IssuerOnboardingCard: React.FC<IssuerOnboardingCardProps> = ({
  issuerProfile,
  onRegistered,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    clearErrors,
  } = useForm<OrgFormData>({
    resolver: zodResolver(orgSchema),
    defaultValues: { name: '', domain: '' },
    mode: 'onBlur',
  });

  const onSubmit = async (data: OrgFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    clearErrors();
    try {
      await issuerApi.registerOrg(data);
      onRegistered();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Registered but pending verification
  if (issuerProfile && !issuerProfile.verified) {
    return (
      <div
        className="rounded-xl border border-[hsl(var(--muted))] bg-[hsl(var(--muted))] p-4 sm:p-5 flex items-start gap-4 shadow-sm"
        role="status"
      >
        <div className="w-10 h-10 rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            Pending Admin Approval
          </h4>
          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            Your institution <strong>{issuerProfile.name}</strong> ({issuerProfile.domain}) has been registered. Issuance actions are blocked until verified by administrator.
          </p>
        </div>
      </div>
    );
  }

  // Registered and verified
  if (issuerProfile && issuerProfile.verified) {
    return (
      <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] flex items-center justify-center border border-[hsl(var(--primary))]/20">
                <Building2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">{issuerProfile.name}</h3>
                <CardDescription className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
                  {issuerProfile.domain}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] text-xs font-bold border border-[hsl(var(--accent))]/30">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Verified Institution
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // Not registered yet -> show registration form
  return (
    <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-md max-w-xl mx-auto">
      <CardHeader className="text-center">
        <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] flex items-center justify-center mx-auto mb-2">
          <Building2 className="w-5 h-5" aria-hidden="true" />
        </div>
        <CardTitle className="text-lg">Register Issuer Institution</CardTitle>
        <CardDescription className="text-xs">
          Before issuing credentials, set up your educational institution or issuing authority profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {submitError && (
            <div className="rounded-md bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/30 p-3 text-sm text-[hsl(var(--destructive))]" role="alert">
              {submitError}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="orgName">Organization / Institution Name</Label>
            <Input
              id="orgName"
              placeholder="e.g. Stanford University"
              {...register('name')}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'orgName-error' : undefined}
            />
            {errors.name && (
              <p id="orgName-error" className="text-xs text-[hsl(var(--destructive))]" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="orgDomain">Official Domain</Label>
            <Input
              id="orgDomain"
              placeholder="e.g. stanford.edu"
              {...register('domain')}
              aria-invalid={!!errors.domain}
              aria-describedby={errors.domain ? 'orgDomain-error' : undefined}
            />
            {errors.domain && (
              <p id="orgDomain-error" className="text-xs text-[hsl(var(--destructive))]" role="alert">
                {errors.domain.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full font-semibold" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />}
            Register Institution
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};