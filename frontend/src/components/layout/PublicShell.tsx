import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../common/Navbar';

// Public chrome: single top bar, content, one-line footer.
// Signed-in portals use AppShell instead, never both (no stacked chrome).
export const PublicShell: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-6">
        <p className="text-center text-sm text-muted-foreground">
          SSDCVE, certificate verification registry
        </p>
      </footer>
    </div>
  );
};
