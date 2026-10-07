import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { LandingPage } from '../pages/LandingPage';
import { ChainPage } from '../pages/ChainPage';
import { AdminLanding } from '../pages/AdminLanding';
import { IssuerLanding } from '../pages/IssuerLanding';
import { HolderLanding } from '../pages/HolderLanding';
import { VerifierLanding } from '../pages/VerifierLanding';
import { PublicVerifyPage } from '../pages/PublicVerifyPage';
import { VerifyByIdPage } from '../pages/VerifyByIdPage';
import { BatchVerifyPage } from '../pages/BatchVerifyPage';
import { VerifierHistoryPage } from '../pages/VerifierHistoryPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { Error401 } from '../components/errors/Error401';
import { Error403 } from '../components/errors/Error403';
import { RequireAuth } from '../components/guards/RequireAuth';
import { RequireRole } from '../components/guards/RequireRole';
import { PublicShell } from '../components/layout/PublicShell';
import { AppShell } from '../components/layout/AppShell';
import { BootHealthCheck } from '../skeletons/BootHealthCheck';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Developer-only plumbing check (not linked in UI) */}
      <Route path="/_health" element={<BootHealthCheck />} />

      {/* Public pages share one top bar, never the portal shell */}
      <Route element={<PublicShell />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/verify" element={<PublicVerifyPage />} />
        <Route path="/verify/batch" element={<BatchVerifyPage />} />
        <Route path="/verify/:credentialId" element={<VerifyByIdPage />} />
        <Route path="/chain" element={<ChainPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<Error401 />} />
        <Route path="/forbidden" element={<Error403 />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Signed-in pages live inside the portal shell */}
      <Route
        path="/verifier/history"
        element={
          <RequireAuth>
            <AppShell title="Past checks">
              <VerifierHistoryPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/*"
        element={
          <RequireAuth>
            <RequireRole allowedRoles={['ADMIN']}>
              <AdminLanding />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/issuer/*"
        element={
          <RequireAuth>
            <RequireRole allowedRoles={['ISSUER', 'ADMIN']}>
              <IssuerLanding />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/holder/*"
        element={
          <RequireAuth>
            <RequireRole allowedRoles={['HOLDER', 'ADMIN']}>
              <HolderLanding />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/verifier/*"
        element={
          <RequireAuth>
            <RequireRole allowedRoles={['VERIFIER', 'ADMIN']}>
              <VerifierLanding />
            </RequireRole>
          </RequireAuth>
        }
      />
    </Routes>
  );
};
