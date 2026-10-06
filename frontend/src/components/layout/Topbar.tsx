import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getRoleDashboardPath } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { ModeToggle } from '../common/ModeToggle';
import { Badge } from '../ui/badge';
import { LogOut, User, Menu, LayoutDashboard } from 'lucide-react';

interface TopbarProps {
  onToggleMobileMenu?: () => void;
  title?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleMobileMenu, title }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [menuOpen]);

  return (
    <header className="h-16 border-b border-border bg-background px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {title && <h1 className="font-display text-lg font-bold tracking-tight text-foreground hidden sm:block">{title}</h1>}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {user ? (
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-foreground hidden md:block">
              {user.fullName}
            </span>
            <Badge className="text-[10px] font-bold px-2 py-0.5">
              {user.role}
            </Badge>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
                className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-foreground font-semibold text-xs hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {user.fullName ? user.fullName[0].toUpperCase() : <User className="w-4 h-4" />}
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card p-1.5 shadow-lg z-50"
                >
                  <div className="px-2.5 py-2 border-b border-border/60 mb-1">
                    <p className="text-xs font-semibold text-foreground truncate">{user.fullName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Link
                    to={getRoleDashboardPath(user.role)}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium text-foreground hover:bg-muted"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    My dashboard
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <ModeToggle />
      </div>
    </header>
  );
};
