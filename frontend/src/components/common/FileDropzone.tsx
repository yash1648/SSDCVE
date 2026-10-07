import React, { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

interface FileDropzoneProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeBytes?: number;
  label?: string;
  description?: string;
  selectedFiles?: File[];
  onClear?: () => void;
  disabled?: boolean;
  className?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelect,
  accept,
  multiple = false,
  maxSizeBytes = 20 * 1024 * 1024, // 20MB
  label = 'Upload credential file',
  description = 'Drag & drop or click to browse',
  selectedFiles = [],
  onClear,
  disabled = false,
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndHandleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const filesArray = Array.from(fileList);

    // Validate size
    for (const f of filesArray) {
      if (f.size > maxSizeBytes) {
        setError(`File "${f.name}" exceeds the maximum allowed size (${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB).`);
        return;
      }
    }

    onFileSelect(filesArray);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    validateAndHandleFiles(e.dataTransfer.files);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
          isDragOver
            ? 'border-primary bg-primary/5 scale-[0.99]'
            : 'border-border/80 hover:border-primary/50 hover:bg-muted/30 bg-card'
        } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => validateAndHandleFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
          <UploadCloud className="w-6 h-6" />
        </div>

        <h4 className="text-sm font-semibold text-foreground mb-1">{label}</h4>
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
        <p className="text-[11px] text-muted-foreground/75">
          {accept ? `Supported formats: ${accept}` : 'All files supported'} • Max {(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Selected ({selectedFiles.length}):</span>
            {onClear && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
              >
                Clear all
              </Button>
            )}
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
            {selectedFiles.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs bg-muted/50 px-3 py-2 rounded-md border border-border"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <File className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate max-w-[280px] font-medium">{f.name}</span>
                  <span className="text-muted-foreground shrink-0">
                    ({(f.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
