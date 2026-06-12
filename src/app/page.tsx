'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Sparkles } from 'lucide-react';
import {
  FREE_CREDIT_LIMIT,
  FREE_CREDITS_KEY,
  LOCALE_KEY,
  PAID_CREDITS_KEY,
  REDEEMED_CODES_KEY,
  clampCreditValue,
} from '@/lib/credits';
import { copy, type Locale } from '@/lib/i18n';
import { UploadZone } from '@/components/ui/upload-zone';
import { GenerationResult } from '@/components/ui/generation-result';

type Stage = 'upload' | 'generating' | 'done';

const MAX_UPLOAD_EDGE = 1024;
const TARGET_UPLOAD_BYTES = 480 * 1024;
const STATUS_POLL_INTERVAL_MS = 3000;
const STATUS_POLL_TIMEOUT_MS = 4 * 60 * 1000;
const MAX_TRANSIENT_POLL_FAILURES = 4;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollGenerationResult(id: string, taskId: string, failedMessage: string) {
  const startedAt = Date.now();
  let transientFailures = 0;

  while (Date.now() - startedAt < STATUS_POLL_TIMEOUT_MS) {
    await sleep(STATUS_POLL_INTERVAL_MS);

    let data: { status?: string; generatedUrl?: string; error?: string };

    try {
      const response = await fetch(
        `/api/generate/status?id=${encodeURIComponent(id)}&taskId=${encodeURIComponent(taskId)}`,
      );
      data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || failedMessage);
      }

      transientFailures = 0;
    } catch (error) {
      transientFailures += 1;

      if (transientFailures >= MAX_TRANSIENT_POLL_FAILURES) {
        throw error instanceof Error ? error : new Error(failedMessage);
      }

      continue;
    }

    if (data.status === 'completed' && data.generatedUrl) {
      return data.generatedUrl;
    }

    if (data.status === 'failed') {
      throw new Error(data.error || failedMessage);
    }
  }

  throw new Error(failedMessage);
}

async function prepareImageForUpload(file: File) {
  if (file.size <= TARGET_UPLOAD_BYTES) {
    return file;
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image compression failed'));
    };
    img.src = objectUrl;
  });

  const scale = Math.min(1, MAX_UPLOAD_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return file;
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const qualities = [0.76, 0.66, 0.56];

  for (const quality of qualities) {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (blob && (blob.size <= TARGET_UPLOAD_BYTES || quality === qualities[qualities.length - 1])) {
      return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
    }
  }

  return file;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>('en');
  const [freeCreditsUsed, setFreeCreditsUsed] = useState(0);
  const [paidCredits, setPaidCredits] = useState(0);
  const [redeemedCodes, setRedeemedCodes] = useState<string[]>([]);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemMessage, setRedeemMessage] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0);
  const [generationId, setGenerationId] = useState('');

  const t = copy[locale];
  const freeCreditsLeft = Math.max(0, FREE_CREDIT_LIMIT - freeCreditsUsed);
  const totalCredits = freeCreditsLeft + paidCredits;
  const canGenerate = totalCredits > 0;
  const stage: Stage = generatedImageUrl ? 'done' : uploadedImageUrl || isGenerating ? 'generating' : 'upload';

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_KEY);
    const storedFreeUsed = Number(window.localStorage.getItem(FREE_CREDITS_KEY) || 0);
    const storedPaidCredits = Number(window.localStorage.getItem(PAID_CREDITS_KEY) || 0);
    const storedRedeemedCodes = window.localStorage.getItem(REDEEMED_CODES_KEY);

    if (storedLocale === 'zh' || storedLocale === 'en') {
      setLocale(storedLocale);
    }

    setFreeCreditsUsed(clampCreditValue(storedFreeUsed));
    setPaidCredits(clampCreditValue(storedPaidCredits));

    if (storedRedeemedCodes) {
      try {
        const parsed = JSON.parse(storedRedeemedCodes);
        if (Array.isArray(parsed)) {
          setRedeemedCodes(parsed.filter((item) => typeof item === 'string'));
        }
      } catch {
        setRedeemedCodes([]);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCALE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    if (!isGenerating) {
      setGenerationElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setGenerationElapsedSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isGenerating]);

  const creditSummary = useMemo(
    () => [
      { label: t.freeCredits, value: freeCreditsLeft },
      { label: t.paidCredits, value: paidCredits },
    ],
    [freeCreditsLeft, paidCredits, t.freeCredits, t.paidCredits],
  );

  const consumeCredit = () => {
    if (freeCreditsLeft > 0) {
      const nextUsed = freeCreditsUsed + 1;
      setFreeCreditsUsed(nextUsed);
      window.localStorage.setItem(FREE_CREDITS_KEY, String(nextUsed));
      return;
    }

    const nextPaidCredits = Math.max(0, paidCredits - 1);
    setPaidCredits(nextPaidCredits);
    window.localStorage.setItem(PAID_CREDITS_KEY, String(nextPaidCredits));
  };

  const handleFileSelect = async (file: File) => {
    if (!canGenerate) {
      alert(t.noCredits);
      return;
    }

    setIsUploading(true);
    setGeneratedImageUrl('');

    try {
      const formData = new FormData();
      const uploadFile = await prepareImageForUpload(file);
      formData.append('file', uploadFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const message = await getErrorMessage(response, t.uploadFailed);
        throw new Error(message);
      }

      const result = await response.json();
      setUploadedImageUrl(result.url);
      await handleGenerate(result.url);
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : t.uploadRetry);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async (imageUrl?: string) => {
    const urlToUse = imageUrl || uploadedImageUrl;
    if (!urlToUse) return;

    if (!canGenerate) {
      alert(t.noCredits);
      return;
    }

    setIsGenerating(true);
    setGenerationElapsedSeconds(0);
    setGeneratedImageUrl('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: urlToUse,
          style: 'cartoon',
        }),
      });

      if (!response.ok) {
        const message = await getErrorMessage(response, t.generationFailed);
        throw new Error(message);
      }

      const result = await response.json();
      let finalGeneratedUrl: string = result.generatedUrl;

      if (result.status === 'processing' && result.taskId) {
        finalGeneratedUrl = await pollGenerationResult(result.id, result.taskId, t.generationFailed);
      }

      if (!finalGeneratedUrl) {
        throw new Error(t.generationFailed);
      }

      setGenerationId(result.id);
      setGeneratedImageUrl(finalGeneratedUrl);
      consumeCredit();
    } catch (error) {
      console.error('Generation error:', error);
      alert(error instanceof Error ? error.message : t.generationRetry);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRedeem = async () => {
    const normalizedCode = redeemCode.trim().toUpperCase();
    if (!normalizedCode) return;

    if (redeemedCodes.includes(normalizedCode)) {
      setRedeemMessage(t.redeemFailed);
      return;
    }

    setIsRedeeming(true);
    setRedeemMessage('');

    try {
      const response = await fetch('/api/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: normalizedCode }),
      });

      if (!response.ok) {
        const message = await getErrorMessage(response, t.redeemFailed);
        throw new Error(message);
      }

      const result = await response.json();
      const creditsToAdd = clampCreditValue(Number(result.credits));
      const nextPaidCredits = paidCredits + creditsToAdd;
      const nextRedeemedCodes = [...redeemedCodes, normalizedCode];

      setPaidCredits(nextPaidCredits);
      setRedeemedCodes(nextRedeemedCodes);
      setRedeemCode('');
      setRedeemMessage(`${t.redeemSuccess} +${creditsToAdd}`);
      window.localStorage.setItem(PAID_CREDITS_KEY, String(nextPaidCredits));
      window.localStorage.setItem(REDEEMED_CODES_KEY, JSON.stringify(nextRedeemedCodes));
    } catch (error) {
      console.error('Redeem error:', error);
      setRedeemMessage(error instanceof Error ? error.message : t.redeemFailed);
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImageUrl) return;

    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `pet-id-photo-${generationId || 'generated'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setUploadedImageUrl('');
    setGeneratedImageUrl('');
    setGenerationId('');
  };

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#1f2320]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#ded8cd] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1f6f64] text-white">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-normal">{t.appName}</h1>
              <p className="text-sm text-[#6f716a]">{t.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
              className="h-10 rounded-lg border border-[#ded8cd] bg-white px-3 text-sm font-medium text-[#42463f] transition-colors hover:bg-[#f7f4ee]"
            >
              {locale === 'en' ? 'ZH' : 'EN'}
            </button>
            <div className="hidden items-center gap-2 rounded-lg border border-[#ded8cd] bg-white px-3 py-2 text-sm text-[#575a53] sm:flex">
              <span className="h-2 w-2 rounded-full bg-[#1f6f64]" />
              {t.formatBadge}
            </div>
          </div>
        </header>

        <section className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)]">
          <aside className="flex flex-col justify-between rounded-lg border border-[#ded8cd] bg-[#fffdf8] p-5 shadow-sm">
            <div>
              <p className="mb-3 text-sm font-medium uppercase text-[#b85c38]">{t.studio}</p>
              <h2 className="text-3xl font-semibold leading-tight md:text-5xl">{t.hero}</h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#686b63]">{t.description}</p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {creditSummary.map((item) => (
                  <div key={item.label} className="rounded-lg border border-[#e6dfd4] bg-white p-4">
                    <div className="text-xs uppercase text-[#6f716a]">{item.label}</div>
                    <div className="mt-2 text-3xl font-semibold text-[#1f2320]">{item.value}</div>
                  </div>
                ))}
              </div>

              {!canGenerate && (
                <div className="mt-4 rounded-lg border border-[#e6dfd4] bg-[#fff7ef] p-4 text-sm text-[#6f4a32]">
                  <div className="font-medium text-[#1f2320]">{t.contactTitle}</div>
                  <p className="mt-1 leading-6">{t.contactBody}</p>
                  <div className="mt-3 flex items-start gap-3 rounded-lg border border-[#ead7c9] bg-white p-3">
                    <img
                      src="/wechat-qr.png"
                      alt={t.contactQrAlt}
                      className="h-28 w-28 rounded-lg border border-[#e6dfd4] bg-white object-cover"
                    />
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 rounded-lg bg-[#b85c38] px-3 py-2 text-sm font-medium text-white">
                        <MessageCircle size={16} />
                        {t.contactButton}
                      </div>
                      <p className="mt-2 leading-6 text-[#6f716a]">{t.contactQrHint}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <input
                  value={redeemCode}
                  onChange={(event) => setRedeemCode(event.target.value)}
                  placeholder={t.redeemPlaceholder}
                  className="h-11 min-w-0 flex-1 rounded-lg border border-[#d8d2c8] bg-white px-3 text-sm outline-none focus:border-[#1f6f64]"
                />
                <button
                  onClick={handleRedeem}
                  disabled={isRedeeming || !redeemCode.trim()}
                  className="h-11 rounded-lg bg-[#1f6f64] px-4 text-sm font-medium text-white transition-colors hover:bg-[#18584f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t.redeemButton}
                </button>
              </div>
              {redeemMessage && <p className="mt-2 text-sm text-[#6f716a]">{redeemMessage}</p>}
            </div>

            <div className="mt-8 grid gap-3 text-sm text-[#575a53]">
              <StatusRow active={stage === 'upload'} done={stage !== 'upload'} label={t.uploadStep} />
              <StatusRow active={stage === 'generating'} done={stage === 'done'} label={t.generateStep} />
              <StatusRow active={stage === 'done'} done={stage === 'done'} label={t.downloadStep} />
            </div>
          </aside>

          <section className="rounded-lg border border-[#ded8cd] bg-white p-4 shadow-sm sm:p-5">
            {!uploadedImageUrl ? (
              <UploadZone copy={t} onFileSelect={handleFileSelect} isUploading={isUploading} disabled={!canGenerate} />
            ) : (
              <GenerationResult
                copy={t}
                originalUrl={uploadedImageUrl}
                generatedUrl={generatedImageUrl}
                isGenerating={isGenerating}
                elapsedSeconds={generationElapsedSeconds}
                canGenerate={canGenerate}
                onRegenerate={() => handleGenerate()}
                onDownload={handleDownload}
                onReset={handleReset}
              />
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function StatusRow({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#e6dfd4] bg-white px-3 py-3">
      <span
        className={`h-3 w-3 rounded-full ${
          done ? 'bg-[#1f6f64]' : active ? 'bg-[#d8893a]' : 'bg-[#d8d2c8]'
        }`}
      />
      <span className={active ? 'font-medium text-[#1f2320]' : ''}>{label}</span>
    </div>
  );
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      return data.error || data.details || fallback;
    }

    if (contentType.includes('text/html')) {
      return `${fallback}. The server timed out. Please try again in a moment.`;
    }

    const text = await response.text();
    const trimmedText = text.trim();

    if (!trimmedText || trimmedText.startsWith('<!DOCTYPE') || trimmedText.startsWith('<html')) {
      return `${fallback}. The server timed out. Please try again in a moment.`;
    }

    return trimmedText || fallback;
  } catch {
    return fallback;
  }
}
