import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import type { VerificationStatus } from '../../types';

interface VerificationStatusBadgeProps {
  status: VerificationStatus | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const VerificationStatusBadge: React.FC<VerificationStatusBadgeProps> = ({
  status,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  switch (status) {
    case 'VALID':
      return (
        <Badge
          variant="outline"
          className={`bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 font-medium inline-flex items-center rounded-full ${sizeClasses[size]} ${className}`}
        >
          <ShieldCheck className={`${iconSizes[size]} text-emerald-600 dark:text-emerald-400`} />
          <span>VALID</span>
        </Badge>
      );
    case 'TAMPERED':
      return (
        <Badge
          variant="outline"
          className={`bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 font-medium inline-flex items-center rounded-full ${sizeClasses[size]} ${className}`}
        >
          <ShieldAlert className={`${iconSizes[size]} text-rose-600 dark:text-rose-400`} />
          <span>TAMPERED</span>
        </Badge>
      );
    case 'REVOKED':
      return (
        <Badge
          variant="outline"
          className={`bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800 font-medium inline-flex items-center rounded-full ${sizeClasses[size]} ${className}`}
        >
          <ShieldX className={`${iconSizes[size]} text-orange-600 dark:text-orange-400`} />
          <span>REVOKED</span>
        </Badge>
      );
    case 'EXPIRED':
      return (
        <Badge
          variant="outline"
          className={`bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-medium inline-flex items-center rounded-full ${sizeClasses[size]} ${className}`}
        >
          <Clock className={`${iconSizes[size]} text-amber-600 dark:text-amber-400`} />
          <span>EXPIRED</span>
        </Badge>
      );
    case 'NOT_FOUND':
      return (
        <Badge
          variant="outline"
          className={`bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 font-medium inline-flex items-center rounded-full ${sizeClasses[size]} ${className}`}
        >
          <HelpCircle className={`${iconSizes[size]} text-zinc-500`} />
          <span>NOT_FOUND</span>
        </Badge>
      );
    case 'UNAVAILABLE':
      return (
        <Badge
          variant="outline"
          className={`bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-medium inline-flex items-center rounded-full ${sizeClasses[size]} ${className}`}
        >
          <AlertTriangle className={`${iconSizes[size]} text-slate-500`} />
          <span>UNAVAILABLE</span>
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={`font-medium ${sizeClasses[size]} ${className}`}>
          <span>{status}</span>
        </Badge>
      );
  }
};
