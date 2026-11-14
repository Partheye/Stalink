import React, { useEffect, useState } from 'react';
import {
  FileText,
  MapPin,
  Pause,
  Play,
  Image as ImageIcon,
} from 'lucide-react';
import type { MessageAttachment } from '../types/messaging';

interface AttachmentCardProps {
  attachment: MessageAttachment;
  isOutgoing: boolean;
}

export const AttachmentCard: React.FC<AttachmentCardProps> = ({
  attachment,
  isOutgoing,
}) => {
  const [imgError, setImgError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const duration = attachment.durationSec ?? 18;

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setElapsedSec((prev) => {
        if (prev + 1 >= duration) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isPlaying, duration]);

  const surfaceBg = isOutgoing
    ? 'bg-emerald-950/[0.06] dark:bg-black/25 border-emerald-900/10 dark:border-white/10'
    : 'bg-slate-100/90 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80';

  if (attachment.kind === 'photo') {
    return (
      <div className={`mb-1.5 w-full max-w-[340px] overflow-hidden rounded-lg border ${surfaceBg}`}>
        {attachment.imageUrl && !imgError ? (
          <img
            src={attachment.imageUrl}
            alt={attachment.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-44 object-cover block"
          />
        ) : (
          <div className="w-full h-36 flex flex-col items-center justify-center gap-1.5 bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 text-center">
            <ImageIcon className="w-6 h-6 opacity-70" />
            <span className="text-xs font-medium">{attachment.title}</span>
          </div>
        )}
        <div className="px-2.5 py-1.5 flex items-center justify-between gap-3 text-[11px] text-slate-600 dark:text-slate-300">
          <span className="font-medium truncate">{attachment.title}</span>
          <span className="font-mono-tabular shrink-0 opacity-80">
            {attachment.fileSize ?? '42 KB'}
          </span>
        </div>
      </div>
    );
  }

  if (attachment.kind === 'location') {
    return (
      <div className={`mb-1.5 rounded-lg border p-2.5 ${surfaceBg}`}>
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/15 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              {attachment.title}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
              {attachment.subtitle}
            </p>
            <p className="mt-1 text-[11px] font-mono-tabular text-slate-700 dark:text-slate-200">
              {attachment.coordinates} · {attachment.elevation}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (attachment.kind === 'voice') {
    const progressPct = Math.round((elapsedSec / duration) * 100);
    const formatSec = (s: number) =>
      `0:${String(s).padStart(2, '0')}`;

    return (
      <div className={`mb-1.5 rounded-lg border px-2.5 py-2 min-w-[220px] ${surfaceBg}`}>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
            className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="h-1.5 w-full rounded-full bg-slate-300/80 dark:bg-slate-600/80 overflow-hidden">
              <div
                className="h-full bg-emerald-600 dark:bg-emerald-400 transition-[width] duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
              <span className="truncate">{attachment.title}</span>
              <span className="font-mono-tabular shrink-0 ml-2">
                {isPlaying ? formatSec(elapsedSec) : formatSec(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-1.5 rounded-lg border p-2.5 ${surfaceBg}`}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-sky-600/15 dark:bg-sky-400/15 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
            {attachment.title}
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
            {attachment.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};
