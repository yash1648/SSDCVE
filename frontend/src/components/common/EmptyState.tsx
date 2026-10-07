import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border/80 bg-card/50 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="gap-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
