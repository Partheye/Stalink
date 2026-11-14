import React from 'react';
import { Pause, Play, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { ConnectionMode, ConnectionState } from '../types/messaging';

interface ConnectionBannerProps {
  connectionState: ConnectionState;
  connectionMode: ConnectionMode;
  autoToggleEnabled: boolean;
  secondsUntilToggle: number;
  queuedCount: number;
  isSyncing: boolean;
  lastSyncSummary: string | null;
  mobileQueueOpen?: boolean;
  onToggleAuto: () => void;
  onManualToggle: () => void;
  onToggleMobileQueue?: () => void;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  connectionState,
  connectionMode,
  autoToggleEnabled,
  secondsUntilToggle,
  queuedCount,
  isSyncing,
  lastSyncSummary,
  mobileQueueOpen = false,
  onToggleAuto,
  onManualToggle,
  onToggleMobileQueue,
}) => {
  const isOnline = connectionState === 'Online';
  const modeDetail =
    connectionMode === 'satellite_burst' ? 'Satellite Burst' : 'Local Mesh';

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="connection-status-banner"
      className={`relative z-20 shrink-0 px-3 sm:px-5 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
        isOnline
          ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800/70 text-emerald-950 dark:text-emerald-100'
          : 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800/70 text-amber-950 dark:text-amber-100'
      }`}
    >
      {/* Left: Dynamic Online / Offline Status Message */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            isOnline
              ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950'
              : 'bg-amber-600 text-white dark:bg-amber-500 dark:text-slate-950'
          }`}
          aria-hidden="true"
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : isOnline ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" />
          )}
        </div>

        <div className="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-display font-bold tracking-tight">
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <span className="text-slate-700 dark:text-slate-200">
            {isSyncing
              ? 'Processing Store-and-Forward queue...'
              : isOnline
                ? lastSyncSummary
                  ? `${modeDetail} · ${lastSyncSummary}`
                  : `${modeDetail} active · Messages send immediately`
                : 'No Network · Messages stored in Pending Queue'}
          </span>
          {!isOnline && queuedCount > 0 && (
            <span className="font-mono-tabular font-semibold text-amber-800 dark:text-amber-300">
              ({queuedCount} queued)
            </span>
          )}
        </div>
      </div>

      {/* Right: 15s Auto-Toggle Countdown & Controls */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto sm:ml-auto justify-between sm:justify-end">
        <span
          data-testid="auto-toggle-countdown"
          className="font-mono-tabular text-[11px] font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap"
        >
          <span className="sm:hidden">
            {autoToggleEnabled ? `Auto: ${secondsUntilToggle}s` : 'Paused'}
          </span>
          <span className="hidden sm:inline">
            {autoToggleEnabled
              ? `Next auto-switch in ${secondsUntilToggle}s`
              : 'Auto-switch paused'}
          </span>
        </span>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {onToggleMobileQueue && (
            <button
              type="button"
              onClick={onToggleMobileQueue}
              aria-pressed={mobileQueueOpen}
              className={`lg:hidden inline-flex items-center gap-1 px-2 min-h-[34px] rounded-md border text-[11px] font-medium whitespace-nowrap transition-colors ${
                mobileQueueOpen
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'border-slate-300/80 dark:border-slate-700 bg-white/90 dark:bg-[#182229] text-slate-800 dark:text-slate-100'
              }`}
            >
              <span>Queue ({queuedCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleAuto}
            aria-label={
              autoToggleEnabled
                ? 'Pause 15-second automatic connection toggle'
                : 'Resume 15-second automatic connection toggle'
            }
            className="inline-flex items-center gap-1 px-2 sm:px-2.5 min-h-[34px] rounded-md border border-slate-300/80 dark:border-slate-700 bg-white/90 dark:bg-[#182229] text-[11px] sm:text-[11.5px] font-medium text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-[#202C33] whitespace-nowrap transition-colors"
          >
            {autoToggleEnabled ? (
              <>
                <Pause className="w-3 h-3 shrink-0" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 shrink-0" />
                <span>Resume</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onManualToggle}
            data-testid="manual-connection-toggle"
            className={`inline-flex items-center gap-1 px-2.5 min-h-[34px] rounded-md text-[11px] sm:text-[11.5px] font-semibold whitespace-nowrap transition-colors ${
              isOnline
                ? 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950'
            }`}
          >
            {isOnline ? 'Switch Offline' : 'Switch Online'}
          </button>
        </div>
      </div>
    </div>
  );
};
