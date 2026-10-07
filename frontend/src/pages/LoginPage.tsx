import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth, getRoleDashboardPath } from '../hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Return-to preserved by guards as ?next=<pathname><search>; only relative paths.
  const next = searchParams.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setLoginFailed(false);

    try {
      const response = await login(data);
      toast.success(`Welcome back, ${response.fullName}!`);
      navigate(safeNext ?? getRoleDashboardPath(response.role), { replace: true });
    } catch {
      setLoginFailed(true);
      toast.error('The email or password you entered is incorrect.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-12 px-4">
      <Card>
        <CardHeader>
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <LogIn className="h-5 w-5" />
          </div>
          <CardTitle className="font-display text-2xl">Sign in</CardTitle>
          <CardDescription>Access your dashboard to manage or verify certificates.</CardDescription>
        </CardHeader>
        <CardContent>
          {loginFailed && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Incorrect email or password</AlertTitle>
              <AlertDescription>Please check your details and try again.</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.edu"
                autoComplete="email"
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && <p id="email-error" role="alert" className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                aria-describedby={errors.password ? 'password-error' : undefined}
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              {errors.password && <p id="password-error" role="alert" className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Need an account?{' '}
            <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
