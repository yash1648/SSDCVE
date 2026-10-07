import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  title?: string;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 180,
  title,
  className = '',
}) => {
  return (
    <div
      className={`inline-flex flex-col items-center p-4 bg-white rounded-xl shadow-lg border border-slate-200 text-slate-900 ${className}`}
    >
      {title && (
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          <QrCode className="w-3.5 h-3.5" />
          <span>{title}</span>
        </div>
      )}
      <div className="p-2 bg-white rounded-lg">
        <QRCodeSVG
          value={value}
          size={size}
          level="M"
          includeMargin={false}
        />
      </div>
      <div className="mt-2 text-[10px] text-slate-400 font-mono max-w-[200px] truncate text-center">
        {value}
      </div>
    </div>
  );
};
