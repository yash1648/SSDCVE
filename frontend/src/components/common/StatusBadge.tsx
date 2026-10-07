import React from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';

interface StatusBadgeProps {
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'ACTIVE':
      return (
        <Badge
          variant="outline"
          className={`bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 font-medium inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>ACTIVE</span>
        </Badge>
      );
    case 'REVOKED':
      return (
        <Badge
          variant="outline"
          className={`bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 font-medium inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>REVOKED</span>
        </Badge>
      );
    case 'EXPIRED':
      return (
        <Badge
          variant="outline"
          className={`bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-medium inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>EXPIRED</span>
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={`font-medium ${className}`}>
          <span>{status}</span>
        </Badge>
      );
  }
};
