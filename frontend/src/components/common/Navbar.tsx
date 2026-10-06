import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, LogIn, UserPlus, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModeToggle } from './ModeToggle';

const roleDashboard: Record<string, string> = {
  ADMIN: '/admin',
  ISSUER: '/issuer',
  HOLDER: '/holder',
  VERIFIER: '/verifier',
};

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const dashboardPath = user ? roleDashboard[user.role] : null;
  const linkCls = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
    }`;

  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <span className="font-display font-bold tracking-tight">SSDCVE</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link to="/verify" className={linkCls(location.pathname.startsWith('/verify'))}>
              Verify
            </Link>
            <Link to="/chain" className={linkCls(location.pathname.startsWith('/chain'))}>
              Chain
            </Link>
            {isAuthenticated && dashboardPath && (
              <Link to={dashboardPath} className={linkCls(location.pathname === dashboardPath)}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle />
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">{user.fullName}</span>
              <Badge>{user.role}</Badge>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">
                  <LogIn className="w-4 h-4" />
                  Sign in
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">
                  <UserPlus className="w-4 h-4" />
                  Create account
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
