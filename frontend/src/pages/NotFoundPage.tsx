import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        The page you asked for does not exist or has moved.
      </p>
      <Button asChild className="mt-6 gap-2">
        <Link to="/">
          <ArrowLeft className="w-4 h-4" />
          Back home
        </Link>
      </Button>
    </div>
  );
};
