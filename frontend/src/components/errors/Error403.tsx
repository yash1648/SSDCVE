import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldBan, ArrowLeft, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Error403Props {
  attemptedPath?: string;
  currentRole?: UserRole | null;
  allowedRoles?: UserRole[];
}

export const Error403: React.FC<Error403Props> = ({ currentRole }) => {
  const navigate = useNavigate();
  const { user, getDashboardPath, logout } = useAuth();

  const userRole = currentRole || user?.role || 'HOLDER';
  const legitimatePath = getDashboardPath(userRole);

  const handleSwitchAccount = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="mx-auto max-w-md py-16 px-4">
      <Card className="text-center">
        <CardHeader className="space-y-2">
          <div className="mx-auto mb-2 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
            <ShieldBan className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Access denied
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            This area is not available for your account type. Please return to
            your dashboard or switch to an account with access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => navigate(legitimatePath, { replace: true })} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              My dashboard
            </Button>
            <Button variant="outline" onClick={handleSwitchAccount} className="flex-1">
              <ArrowRightLeft className="h-4 w-4 mr-1.5" />
              Switch account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
