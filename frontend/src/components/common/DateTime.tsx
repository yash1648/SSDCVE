import React from 'react';

interface DateTimeProps {
  value: string | number | Date | null | undefined;
  className?: string;
  showTime?: boolean;
}

export const DateTime: React.FC<DateTimeProps> = ({
  value,
  className = '',
  showTime = true,
}) => {
    if (!value) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const formattedDate = date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const formattedTime = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <span
      title={date.toISOString()}
      className={`text-xs text-muted-foreground tabular-nums ${className}`}
    >
      {formattedDate}
      {showTime && ` ${formattedTime}`}
    </span>
  );
};
