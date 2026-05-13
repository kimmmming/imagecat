'use client';

import { Download, RefreshCw, RotateCcw } from 'lucide-react';
import type { Copy } from '@/lib/i18n';

interface GenerationResultProps {
  copy: Copy;
  originalUrl: string;
  generatedUrl?: string;
  isGenerating: boolean;
  canGenerate: boolean;
  onRegenerate: () => void;
  onDownload: () => void;
  onReset: () => void;
}

function resolveImageUrl(url: string) {
  if (url.startsWith('/') && url.includes('tmp')) {
    return `/api/serve-image?path=${encodeURIComponent(url)}`;
  }

  return url;
}

export function GenerationResult({
  copy,
  originalUrl,
  generatedUrl,
  isGenerating,
  canGenerate,
  onRegenerate,
  onDownload,
  onReset,
}: GenerationResultProps) {
  return (
    <div className="flex min-h-[620px] flex-col">
      <div className="grid flex-1 gap-4 lg:grid-cols-2">
        <ImagePane title={copy.original} imageUrl={resolveImageUrl(originalUrl)} alt="Uploaded pet photo" />

        <div className="flex min-h-[420px] flex-col rounded-lg border border-[#ded8cd] bg-[#fbfaf7]">
          <div className="flex items-center justify-between border-b border-[#e6dfd4] px-4 py-3">
            <h3 className="font-medium text-[#1f2320]">{copy.resultTitle}</h3>
            <span className="rounded-lg bg-[#eff7f4] px-2 py-1 text-xs text-[#1f6f64]">
              {generatedUrl ? copy.ready : isGenerating ? copy.generating : copy.waiting}
            </span>
          </div>

          <div className="grid flex-1 place-items-center p-4">
            {isGenerating ? (
              <div className="text-center">
                <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-2 border-[#1f6f64] border-t-transparent" />
                <p className="font-medium text-[#1f2320]">{copy.generatingTitle}</p>
                <p className="mt-2 text-sm text-[#6f716a]">{copy.generatingHelp}</p>
              </div>
            ) : generatedUrl ? (
              <img
                src={resolveImageUrl(generatedUrl)}
                alt="Generated pet portrait"
                className="aspect-square w-full max-w-[440px] rounded-lg object-cover shadow-sm"
              />
            ) : (
              <div className="rounded-lg border border-dashed border-[#d8d2c8] px-6 py-8 text-sm text-[#6f716a]">
                {copy.waitingResult}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-[#e6dfd4] pt-4">
        <button
          onClick={onReset}
          disabled={isGenerating}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#d8d2c8] bg-white px-4 text-sm font-medium text-[#42463f] transition-colors hover:bg-[#f7f4ee] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw size={18} />
          {copy.newPhoto}
        </button>

        <button
          onClick={onRegenerate}
          disabled={isGenerating || !canGenerate}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#1f6f64] bg-white px-4 text-sm font-medium text-[#1f6f64] transition-colors hover:bg-[#eff7f4] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={18} />
          {copy.regenerate}
        </button>

        <button
          onClick={onDownload}
          disabled={!generatedUrl || isGenerating}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#1f6f64] px-5 text-sm font-medium text-white transition-colors hover:bg-[#18584f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={18} />
          {copy.download}
        </button>
      </div>
    </div>
  );
}

function ImagePane({ title, imageUrl, alt }: { title: string; imageUrl: string; alt: string }) {
  return (
    <div className="flex min-h-[420px] flex-col rounded-lg border border-[#ded8cd] bg-[#fbfaf7]">
      <div className="border-b border-[#e6dfd4] px-4 py-3">
        <h3 className="font-medium text-[#1f2320]">{title}</h3>
      </div>
      <div className="grid flex-1 place-items-center p-4">
        <img
          src={imageUrl}
          alt={alt}
          className="aspect-square w-full max-w-[440px] rounded-lg object-cover shadow-sm"
        />
      </div>
    </div>
  );
}
