import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface HashDisplayProps {
  value: string | null | undefined;
  label?: string;
  truncateLength?: number;
  className?: string;
}

export const HashDisplay: React.FC<HashDisplayProps> = ({
  value,
  label,
  truncateLength = 8,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy error
    }
  };

  const truncated =
    value.length > truncateLength * 2 + 3
      ? `${value.slice(0, truncateLength)}...${value.slice(-truncateLength)}`
      : value;

  return (
    <div className={`inline-flex items-center gap-1.5 group font-mono text-xs ${className}`}>
      {label && <span className="text-muted-foreground font-sans text-xs">{label}:</span>}
      <span
        title={value}
        className="bg-muted/70 hover:bg-muted text-foreground px-2 py-0.5 rounded border border-border transition-colors cursor-default select-all"
      >
        {truncated}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        title="Copy full hash to clipboard"
        aria-label="Copy to clipboard"
        className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
        )}
      </button>
    </div>
  );
};
