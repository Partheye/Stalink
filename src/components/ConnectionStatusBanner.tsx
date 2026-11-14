import React from 'react';
import { ArrowLeftRight, Wifi, WifiOff } from 'lucide-react';
import type { ConnectionModeState } from '../types/connection';
import { formatDurationSeconds } from '../utils/connectionEngine';

interface ConnectionStatusBannerProps {
  connectionMode: ConnectionModeState;
  manualOverride: boolean;
  secondsUntilNextEval: number;
  intervalSec: number;
  latencyMs: number | null;
  packetLossPct: number;
  transitionCount: number;
  stateElapsedSeconds: number;
  signalStrengthPct: number;
  onToggleOverride: () => void;
  onManualToggleMode: () => void;
}

export const ConnectionStatusBanner: React.FC<ConnectionStatusBannerProps> = ({
  connectionMode,
  manualOverride,
  secondsUntilNextEval,
  latencyMs,
  packetLossPct,
  transitionCount,
  stateElapsedSeconds,
  signalStrengthPct,
  onToggleOverride,
  onManualToggleMode,
}) => {
  const isOnline = connectionMode === 'Online';

  return (
    <section
      id="overview"
      aria-labelledby="connection-status-heading"
      className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
    >
      {/* Top Hero Status Row */}
      <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          {/* Semantic Connection Status Indicator (Green Online / Red-Gray Offline) */}
          <div
            data-testid="status-indicator"
            data-mode={connectionMode}
            className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border transition-colors duration-200 ${
              isOnline
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/70 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-7 h-7" strokeWidth={2.1} />
            ) : (
              <WifiOff className="w-7 h-7" strokeWidth={2.1} />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span>Primary Connection State</span>
              <span aria-hidden="true">·</span>
              <span>
                {manualOverride
                  ? 'Manual override active (auto-toggle paused)'
                  : `Auto-toggle active · Next check in ${secondsUntilNextEval}s`}
              </span>
            </div>

            <div className="mt-1 flex items-baseline gap-3">
              <h1
                id="connection-status-heading"
                className={`font-display text-2xl sm:text-3xl font-bold tracking-tight ${
                  isOnline
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {connectionMode}
              </h1>
              <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                Signal {signalStrengthPct}%
              </span>
            </div>
          </div>
        </div>

        {/* Manual Override Switch & Direct State Toggle */}
        <div className="flex flex-wrap items-center gap-3 pt-1 lg:pt-0">
          <div className="flex items-center gap-3 px-3.5 py-2 min-h-[44px] rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80">
            <span
              id="manual-override-label"
              className="text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap"
            >
              Manual Override
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={manualOverride}
              aria-labelledby="manual-override-label"
              onClick={onToggleOverride}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                manualOverride
                  ? 'bg-emerald-600 dark:bg-emerald-500'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-150 ${
                  manualOverride ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={onManualToggleMode}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
            <span>Switch to {isOnline ? 'Offline' : 'Online'}</span>
          </button>
        </div>
      </div>

      {/* 4-Column Telemetry KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-200 dark:border-slate-800 divide-y lg:divide-y-0 divide-x divide-slate-200 dark:divide-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
        <div className="px-5 py-3.5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Heartbeat Latency
          </p>
          <p className="mt-1 text-lg font-semibold font-mono-tabular text-slate-900 dark:text-slate-100">
            {latencyMs === null ? 'Timeout' : `${latencyMs} ms`}
          </p>
        </div>

        <div className="px-5 py-3.5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Packet Loss
          </p>
          <p className="mt-1 text-lg font-semibold font-mono-tabular text-slate-900 dark:text-slate-100">
            {packetLossPct.toFixed(1)}%
          </p>
        </div>

        <div className="px-5 py-3.5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            State Transitions
          </p>
          <p
            data-testid="transition-count"
            className="mt-1 text-lg font-semibold font-mono-tabular text-slate-900 dark:text-slate-100"
          >
            {transitionCount}
          </p>
        </div>

        <div className="px-5 py-3.5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Time in Current State
          </p>
          <p className="mt-1 text-lg font-semibold font-mono-tabular text-slate-900 dark:text-slate-100">
            {formatDurationSeconds(stateElapsedSeconds)}
          </p>
        </div>
      </div>
    </section>
  );
};
