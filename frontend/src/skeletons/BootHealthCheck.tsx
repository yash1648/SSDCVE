import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { adminApi } from '../lib/api';
import type { AdminUserResponse } from '../types/admin';
import { QRCodeDisplay } from '../components/qr/QRCodeDisplay';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Server,
  Key,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface HealthCheckState {
  status: 'idle' | 'running' | 'success' | 'error';
  loginSuccess: boolean;
  proxySuccess: boolean;
  tokenReceived: boolean;
  usersCount: number | null;
  users: AdminUserResponse[];
  error?: string;
  durationMs?: number;
}

export const BootHealthCheck: React.FC = () => {
  const { login, user } = useAuth();

  const [state, setState] = useState<HealthCheckState>({
    status: 'idle',
    loginSuccess: false,
    proxySuccess: false,
    tokenReceived: false,
    usersCount: null,
    users: [],
  });

  const runPlumbingHealthCheck = async () => {
    const startTime = performance.now();
    setState({
      status: 'running',
      loginSuccess: false,
      proxySuccess: false,
      tokenReceived: false,
      usersCount: null,
      users: [],
    });

    try {
      // Step 1: Login via proxy (/api/auth/login) with Admin credentials
      const authResponse = await login({
        email: 'admin@test.edu',
        password: 'TestPass-123!',
      });

      const tokenReceived = !!authResponse.accessToken;

      // Step 2: Fetch Admin users via proxy (/api/admin/users)
      // This proves BOTH Vite proxy (/api -> :6969) AND Bearer Auth plumbing!
      const users = await adminApi.getUsers();
      const durationMs = Math.round(performance.now() - startTime);

      setState({
        status: 'success',
        loginSuccess: true,
        proxySuccess: true,
        tokenReceived,
        usersCount: users.length,
        users: users.slice(0, 5), // Preview first 5
        durationMs,
      });

      toast.success(
        `Proxy & Auth Verified! Retrieved ${users.length} users in ${durationMs}ms`
      );
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown health check failure';
      const durationMs = Math.round(performance.now() - startTime);

      setState((prev) => ({
        ...prev,
        status: 'error',
        error: errorMessage,
        durationMs,
      }));

      toast.error(
        `Failed to verify proxy/auth plumbing: ${errorMessage}`
      );
    }
  };

  // Auto-run on boot
  useEffect(() => {
    runPlumbingHealthCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Hero header */}
      <div className="mb-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Vite + React + Tailwind + Router + Axios Booted
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Frontend Architecture &amp; Plumbing Health Check
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Automated verification calling <code className="text-emerald-400 font-mono">GET /api/admin/users</code> via Vite proxy (<code className="text-slate-300 font-mono">/api → :6969</code>)
          </p>
        </div>

        <button
          onClick={runPlumbingHealthCheck}
          disabled={state.status === 'running'}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition-all shadow-lg shadow-emerald-950/40"
        >
          {state.status === 'running' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>Re-run Health Check</span>
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
              <Server className="w-5 h-5" />
            </div>
            {state.proxySuccess ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/40">
                <CheckCircle2 className="w-3.5 h-3.5" /> ONLINE
              </span>
            ) : state.status === 'running' ? (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> TESTING
              </span>
            ) : (
              <span className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> FAILED
              </span>
            )}
          </div>
          <h3 className="font-semibold text-sm text-slate-200">Vite Proxy Plumbing</h3>
          <p className="text-xs text-slate-400 mt-1">
            <code className="text-emerald-400">/api</code> proxied to <code className="text-slate-300">http://localhost:6969</code>
          </p>
          <div className="text-[11px] text-slate-500 mt-2 font-mono">
            Direct :6969 calls blocked (No CORS required)
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
              <Key className="w-5 h-5" />
            </div>
            {state.tokenReceived ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/40">
                <CheckCircle2 className="w-3.5 h-3.5" /> AUTHENTICATED
              </span>
            ) : state.status === 'running' ? (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> LOGGING IN
              </span>
            ) : (
              <span className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> NO TOKEN
              </span>
            )}
          </div>
          <h3 className="font-semibold text-sm text-slate-200">Admin Auth Plumbing</h3>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as <code className="text-emerald-400">{user?.email || 'admin@test.edu'}</code>
          </p>
          <div className="text-[11px] text-slate-500 mt-2 font-mono">
            Role: {user?.role || 'ADMIN'} (Bearer token + Refresh cookie)
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
              <Users className="w-5 h-5" />
            </div>
            {state.usersCount !== null ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/40">
                <CheckCircle2 className="w-3.5 h-3.5" /> 200 OK
              </span>
            ) : state.status === 'running' ? (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> FETCHING
              </span>
            ) : (
              <span className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> FAILED
              </span>
            )}
          </div>
          <h3 className="font-semibold text-sm text-slate-200">GET /api/admin/users</h3>
          <p className="text-xs text-slate-400 mt-1">
            {state.usersCount !== null
              ? `Successfully received ${state.usersCount} users`
              : 'Awaiting admin API response'}
          </p>
          <div className="text-[11px] text-slate-500 mt-2 font-mono">
            Latency: {state.durationMs ? `${state.durationMs}ms` : '-'}
          </div>
        </div>
      </div>

      {/* Main Content: Users payload inspection + QR Library preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users list response preview */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Live Response: GET /api/admin/users
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Proves Axios Bearer interceptor + proxy successfully routed admin query
              </p>
            </div>
            {state.usersCount !== null && (
              <span className="text-xs font-mono bg-slate-800 px-2.5 py-1 rounded-md text-emerald-400 border border-slate-700">
                {state.usersCount} Total Users
              </span>
            )}
          </div>

          {state.error ? (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
              <div className="font-semibold mb-1">Health Check Error:</div>
              <p className="font-mono">{state.error}</p>
            </div>
          ) : state.users.length > 0 ? (
            <div className="space-y-2">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3 font-medium">Role</th>
                      <th className="py-2 px-3 font-medium">Email</th>
                      <th className="py-2 px-3 font-medium">Name</th>
                      <th className="py-2 px-3 font-medium">ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {state.users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              u.role === 'ADMIN'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : u.role === 'ISSUER'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : u.role === 'HOLDER'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-300 truncate max-w-[180px]">
                          {u.email}
                        </td>
                        <td className="py-2 px-3 text-slate-300 truncate max-w-[140px]">
                          {u.fullName}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500 text-[10px] truncate max-w-[100px]">
                          {u.id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500 pt-2 text-center">
                Showing first 5 of {state.usersCount} users. Backend and proxy verified!
              </p>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="text-xs">Connecting to /api/admin/users...</span>
            </div>
          )}
        </div>

        {/* QR Code and Skeletons Nav */}
        <div className="space-y-6">
          {/* Client QR Library Component Check */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col items-center">
            <h3 className="text-sm font-semibold text-slate-200 mb-1 w-full text-left">
              Client QR Library Verification
            </h3>
            <p className="text-xs text-slate-400 mb-4 w-full text-left">
              Rendered client-side via <code className="text-emerald-400">qrcode.react</code>
            </p>

            <QRCodeDisplay
              value="https://ssdcve.dev/verify/sample-proof-token-12345"
              size={140}
              title="Sample QR Verification Envelope"
            />
          </div>

          {/* Router Skeleton Nav Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-1">
              Router Skeleton &amp; Guards
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Explore protected skeletons with RequireAuth &amp; RequireRole:
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                to="/admin"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-emerald-500/50 transition-colors"
              >
                <span>/admin (ADMIN)</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              <Link
                to="/issuer"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-emerald-500/50 transition-colors"
              >
                <span>/issuer (ISSUER)</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              <Link
                to="/holder"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-emerald-500/50 transition-colors"
              >
                <span>/holder (HOLDER)</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              <Link
                to="/verifier"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-emerald-500/50 transition-colors"
              >
                <span>/verifier (VERIFIER)</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
