import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, LogIn, UserPlus, LayoutDashboard, Menu, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const dashboardPath = user ? roleDashboard[user.role] : null;
  const linkCls = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
    }`;

  const isActive = (path: string) => {
    if (path === '/verify') return location.pathname.startsWith('/verify');
    if (path === '/chain') return location.pathname.startsWith('/chain');
    return location.pathname === path;
  };

  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <span className="font-display font-bold tracking-tight">SSDCVE</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/verify" className={linkCls(isActive('/verify'))}>
              Verify
            </Link>
            <Link to="/chain" className={linkCls(isActive('/chain'))}>
              Chain
            </Link>
            {isAuthenticated && dashboardPath && (
              <Link to={dashboardPath} className={linkCls(isActive(dashboardPath))}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle />
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">{user.fullName}</span>
              <Badge>{user.role}</Badge>
              <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Logout">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border py-4 px-4 space-y-2">
          <Link
            to="/verify"
            className={linkCls(isActive('/verify'))}
            onClick={() => setMobileMenuOpen(false)}
          >
            Verify
          </Link>
          <Link
            to="/chain"
            className={linkCls(isActive('/chain'))}
            onClick={() => setMobileMenuOpen(false)}
          >
            Chain
          </Link>
          {isAuthenticated && dashboardPath && (
            <Link
              to={dashboardPath}
              className={linkCls(isActive(dashboardPath))}
              onClick={() => setMobileMenuOpen(false)}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          )}
          {!isAuthenticated && (
            <div className="pt-2 border-t border-border space-y-2">
              <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <LogIn className="w-4 h-4" />
                  Sign in
                </Link>
              </Button>
              <Button size="sm" asChild className="w-full justify-start">
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <UserPlus className="w-4 h-4" />
                  Create account
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
