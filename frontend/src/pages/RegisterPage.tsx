import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const registerSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(255, 'Full name cannot exceed 255 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password cannot exceed 72 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' },
    mode: 'onBlur',
  });

  const passwordValue = watch('password') || '';

  // Password strength calculation
  const calculateStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const strength = calculateStrength(passwordValue);

  const getStrengthLabel = () => {
    if (!passwordValue) return { label: 'Empty', color: 'bg-muted' };
    if (strength <= 2) return { label: 'Weak', color: 'bg-rose-500' };
    if (strength <= 3) return { label: 'Fair', color: 'bg-amber-500' };
    if (strength <= 4) return { label: 'Good', color: 'bg-blue-500' };
    return { label: 'Strong', color: 'bg-emerald-500' };
  };

  const [isRegistered, setIsRegistered] = useState(false);

  const strengthInfo = getStrengthLabel();

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      await registerUser(data);
      toast.success('Account created successfully! Please sign in.', {
        description: `Welcome, ${data.fullName}.`,
      });
      setIsRegistered(true);
    } catch {
      setApiError('Could not create your account. The email may already be in use.');
      toast.error('Registration failed. Please check your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRegistered) {
    return (
      <div className="mx-auto max-w-md py-12 px-4">
        <Card className="border-border shadow-md text-center p-6">
          <CardHeader>
            <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle className="font-display text-2xl">Account Created Successfully</CardTitle>
            <CardDescription>
              Your account has been registered. You can now log in to access your credential workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate('/login')} className="w-full">
              Proceed to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-12 px-4">
      <Card className="border-border shadow-md">
        <CardHeader>
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <UserPlus className="h-5 w-5" />
          </div>
          <CardTitle className="font-display text-2xl">Create Account</CardTitle>
          <CardDescription>
            Join SSD-CVE to manage, issue, or verify verifiable digital credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {apiError && (
              <Alert variant="destructive">
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Dr. Elena Rostova"
                autoComplete="name"
                aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                aria-invalid={!!errors.fullName}
                {...register('fullName')}
              />
              {errors.fullName && <p id="fullName-error" role="alert" className="text-xs text-destructive">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="elena@university.edu"
                autoComplete="email"
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && <p id="email-error" role="alert" className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password (8–72 characters)</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                autoComplete="new-password"
                aria-describedby={errors.password ? 'password-error' : undefined}
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              {errors.password && <p id="password-error" role="alert" className="text-xs text-destructive">{errors.password.message}</p>}

              {/* Password Strength Meter */}
              {passwordValue && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Password Strength:</span>
                    <span className="font-medium text-foreground">{strengthInfo.label}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${strength >= 1 ? strengthInfo.color : 'bg-transparent'}`} />
                    <div className={`h-full ${strength >= 2 ? strengthInfo.color : 'bg-transparent'}`} />
                    <div className={`h-full ${strength >= 3 ? strengthInfo.color : 'bg-transparent'}`} />
                    <div className={`h-full ${strength >= 4 ? strengthInfo.color : 'bg-transparent'}`} />
                    <div className={`h-full ${strength >= 5 ? strengthInfo.color : 'bg-transparent'}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Role & Promotion Hint */}
            <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground flex items-start gap-2.5 border border-border/60">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                New users start with a default role (<strong className="text-foreground">HOLDER</strong>). To issue credentials on behalf of an institution, an administrator can promote your account to <strong className="text-foreground">ISSUER</strong>.
              </span>
            </div>

            <Button type="submit" className="w-full font-semibold" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
