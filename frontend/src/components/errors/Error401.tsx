import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogIn, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Error401Props {
  message?: string;
  onRetry?: () => void;
}

export const Error401: React.FC<Error401Props> = ({
  message = 'Your session has expired. Please sign in again to continue.',
  onRetry,
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleRelogin = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="mx-auto max-w-md py-16 px-4">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto mb-2 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <CardTitle>Session expired</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button onClick={handleRelogin} className="w-full">
            <LogIn className="h-4 w-4" />
            Sign in again
          </Button>
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="w-full">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
