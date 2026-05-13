'use client';

import { useCallback, useState } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';
import type { Copy } from '@/lib/i18n';

interface UploadZoneProps {
  copy: Copy;
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  disabled?: boolean;
}

export function UploadZone({ copy, onFileSelect, isUploading, disabled }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragOver(false);
      if (disabled || isUploading) return;

      const files = Array.from(event.dataTransfer.files);
      const imageFile = files.find((file) => file.type.startsWith('image/'));

      if (imageFile) {
        onFileSelect(imageFile);
      }
    },
    [disabled, isUploading, onFileSelect],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && !disabled) {
        onFileSelect(file);
      }
    },
    [disabled, onFileSelect],
  );

  return (
    <div className="flex min-h-[620px] flex-col">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative flex flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed
          px-6 py-10 text-center transition-colors
          ${isDragOver ? 'border-[#1f6f64] bg-[#eff7f4]' : 'border-[#d8d2c8] bg-[#fbfaf7]'}
          ${disabled || isUploading ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInput}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          disabled={disabled || isUploading}
        />

        <div className="mb-7 grid h-44 w-44 place-items-center rounded-lg border border-[#e1dbd0] bg-white shadow-sm">
          <div className="grid h-28 w-28 place-items-center rounded-lg bg-[#f0ece4]">
            {isUploading ? (
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#1f6f64] border-t-transparent" />
            ) : isDragOver ? (
              <ImageIcon className="h-10 w-10 text-[#1f6f64]" />
            ) : (
              <Upload className="h-10 w-10 text-[#b85c38]" />
            )}
          </div>
        </div>

        <h3 className="text-2xl font-semibold text-[#1f2320]">
          {isUploading ? copy.uploading : copy.uploadTitle}
        </h3>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[#6f716a]">{copy.uploadHelp}</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs text-[#6f716a]">
        <div className="rounded-lg border border-[#e6dfd4] bg-[#fffdf8] px-2 py-3">{copy.squareCrop}</div>
        <div className="rounded-lg border border-[#e6dfd4] bg-[#fffdf8] px-2 py-3">{copy.hdOutput}</div>
        <div className="rounded-lg border border-[#e6dfd4] bg-[#fffdf8] px-2 py-3">{copy.easyDownload}</div>
      </div>
    </div>
  );
}
