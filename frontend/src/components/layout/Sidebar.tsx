import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  KeyRound,
  PlusCircle,
  Wallet,
  FileCheck2,
  Layers,
  History,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { user, role: ctxRole } = useAuth();
  const role = ctxRole || user?.role;
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Show the portal matching the current route (an ADMIN can visit every
  // portal, so role alone picks the wrong section). Fall back to the
  // user's own portal when the route is not portal-specific.
  const path = location.pathname;
  const activePortal: 'admin' | 'issuer' | 'holder' | 'verifier' | null =
    path.startsWith('/admin')
      ? 'admin'
      : path.startsWith('/issuer')
        ? 'issuer'
        : path.startsWith('/holder')
          ? 'holder'
          : path.startsWith('/verifier')
            ? 'verifier'
            : null;
  const portal =
    activePortal ||
    (role === 'ADMIN'
      ? 'admin'
      : role === 'ISSUER'
        ? 'issuer'
        : role === 'HOLDER'
          ? 'holder'
          : role === 'VERIFIER'
            ? 'verifier'
            : null);

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors border-l-[3px] rounded-r-lg ${
      collapsed ? 'justify-center px-2' : ''
    } ${
      isActive
        ? 'bg-primary/10 text-primary font-semibold border-l-primary'
        : 'text-muted-foreground border-l-transparent hover:text-foreground hover:bg-muted/50'
    }`;

  const sectionLabel = (label: string) =>
    collapsed ? null : (
      <div className="px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {label}
      </div>
    );

  const linkLabel = (label: string) => (collapsed ? null : <span>{label}</span>);

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } border-r border-border bg-card flex flex-col h-full transition-[width] duration-200 ease-out`}
    >
      {/* Brand */}
      <div className="h-16 px-5 border-b border-border flex items-center gap-2.5">
        <div className="w-9 h-9 shrink-0 rounded-lg bg-muted flex items-center justify-center text-foreground border border-border">
          <ShieldCheck className="w-5 h-5" />
        </div>
        {collapsed ? null : (
          <div className="min-w-0 flex-1">
            <span className="font-display font-bold text-sm tracking-tight text-foreground block">
              SSD-CVE
            </span>
            <span className="text-[10px] text-muted-foreground tracking-wider block font-medium uppercase truncate">
              {role || 'Verification Engine'}
            </span>
          </div>
        )}
        {onCloseMobile ? null : (
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Public links first */}
        <div className="space-y-1">
          {sectionLabel('Public')}
          <NavLink to="/chain" title="Chain record" className={navItemClass} onClick={onCloseMobile}>
            <Activity className="w-4 h-4 shrink-0" />
            {linkLabel('Chain record')}
          </NavLink>
          <NavLink to="/verify" title="Public Verify" className={navItemClass} onClick={onCloseMobile}>
            <FileCheck2 className="w-4 h-4 shrink-0" />
            {linkLabel('Public Verify')}
          </NavLink>
        </div>
        {/* Role Specific Nav */}
        {portal === 'admin' && role === 'ADMIN' && (
          <div className="space-y-1 pt-2 border-t border-border/60">
            {sectionLabel('Admin Console')}
            <NavLink to="/admin" end title="Dashboard" className={navItemClass} onClick={onCloseMobile}>
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {linkLabel('Dashboard')}
            </NavLink>
            <NavLink to="/admin/users" title="User Directory" className={navItemClass} onClick={onCloseMobile}>
              <Users className="w-4 h-4 shrink-0" />
              {linkLabel('User Directory')}
            </NavLink>
            <NavLink to="/admin/issuers" title="Issuers Queue" className={navItemClass} onClick={onCloseMobile}>
              <Building2 className="w-4 h-4 shrink-0" />
              {linkLabel('Issuers Queue')}
            </NavLink>
            <NavLink to="/admin/verifications" title="Global Audit" className={navItemClass} onClick={onCloseMobile}>
              <Activity className="w-4 h-4 shrink-0" />
              {linkLabel('Global Audit')}
            </NavLink>
          </div>
        )}

        {portal === 'issuer' && (role === 'ISSUER' || role === 'ADMIN') && (
          <div className="space-y-1 pt-2 border-t border-border/60">
            {sectionLabel('Issuer Portal')}
            <NavLink to="/issuer" end title="Overview" className={navItemClass} onClick={onCloseMobile}>
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {linkLabel('Overview')}
            </NavLink>
            <NavLink to="/issuer/credentials" end title="Credentials" className={navItemClass} onClick={onCloseMobile}>
              <FileText className="w-4 h-4 shrink-0" />
              {linkLabel('Credentials')}
            </NavLink>
            <NavLink to="/issuer/credentials/new" title="Issue Credential" className={navItemClass} onClick={onCloseMobile}>
              <PlusCircle className="w-4 h-4 shrink-0" />
              {linkLabel('Issue Credential')}
            </NavLink>
            <NavLink to="/issuer/keys" title="Signing Keys" className={navItemClass} onClick={onCloseMobile}>
              <KeyRound className="w-4 h-4 shrink-0" />
              {linkLabel('Signing Keys')}
            </NavLink>
            <NavLink to="/issuer/verifications" title="Activity Log" className={navItemClass} onClick={onCloseMobile}>
              <Activity className="w-4 h-4 shrink-0" />
              {linkLabel('Activity Log')}
            </NavLink>
          </div>
        )}

        {portal === 'holder' && (role === 'HOLDER' || role === 'ADMIN') && (
          <div className="space-y-1 pt-2 border-t border-border/60">
            {sectionLabel('Student Wallet')}
            <NavLink to="/holder" end title="My Credentials" className={navItemClass} onClick={onCloseMobile}>
              <Wallet className="w-4 h-4 shrink-0" />
              {linkLabel('My Credentials')}
            </NavLink>
          </div>
        )}

        {portal === 'verifier' && (role === 'VERIFIER' || role === 'ADMIN') && (
          <div className="space-y-1 pt-2 border-t border-border/60">
            {sectionLabel('Verifier Portal')}
            <NavLink to="/verifier" end title="Dashboard" className={navItemClass} onClick={onCloseMobile}>
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {linkLabel('Dashboard')}
            </NavLink>
            <NavLink to="/verifier/verify" title="Verify Single" className={navItemClass} onClick={onCloseMobile}>
              <FileCheck2 className="w-4 h-4 shrink-0" />
              {linkLabel('Verify Single')}
            </NavLink>
            <NavLink to="/verifier/batch" title="Batch Verify" className={navItemClass} onClick={onCloseMobile}>
              <Layers className="w-4 h-4 shrink-0" />
              {linkLabel('Batch Verify')}
            </NavLink>
            <NavLink to="/verifier/history" title="History" className={navItemClass} onClick={onCloseMobile}>
              <History className="w-4 h-4 shrink-0" />
              {linkLabel('History')}
            </NavLink>
          </div>
        )}
      </div>

      {/* Footer Info */}
      {collapsed ? null : (
        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          <span>SSDCVE registry</span>
        </div>
      )}
    </aside>
  );
};
