import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/auth';
import { Error403 } from '../errors/Error403';

interface RequireRoleProps {
  allowedRoles: UserRole[];
  children?: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles, children }) => {
  const { user, role } = useAuth();
  const location = useLocation();

  // Role check is UI-level routing guard
  if (!user || !role || !allowedRoles.includes(role)) {
    return (
      <Error403
        attemptedPath={location.pathname}
        currentRole={role || user?.role}
        allowedRoles={allowedRoles}
      />
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
