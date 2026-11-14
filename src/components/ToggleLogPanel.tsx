import React from 'react';
import { ArrowRight, Pause, Play, RefreshCw, Trash2 } from 'lucide-react';
import type { ConnectionStatus, ToggleLogEvent } from '../types/chat';

interface ToggleLogPanelProps {
  connectionStatus: ConnectionStatus;
  autoToggleEnabled: boolean;
  intervalSec: number;
  secondsUntilToggle: number;
  events: ToggleLogEvent[];
  onToggleAutoMode: () => void;
  onManualFlip: () => void;
  onIntervalChange: (sec: number) => void;
  onClearLog: () => void;
}

const INTERVAL_CHOICES = [5, 10, 15] as const;

export const ToggleLogPanel: React.FC<ToggleLogPanelProps> = ({
  connectionStatus,
  autoToggleEnabled,
  intervalSec,
  secondsUntilToggle,
  events,
  onToggleAutoMode,
  onManualFlip,
  onIntervalChange,
  onClearLog,
}) => {
  return (
    <aside
      aria-label="Connection controls and toggle event log"
      className="w-full lg:w-[340px] xl:w-[360px] shrink-0 flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden lg:h-full"
    >
      {/* Simulation Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Connection Simulation
          </h2>
          <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
            {autoToggleEnabled ? `${secondsUntilToggle}s` : 'Paused'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleAutoMode}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap transition-colors"
          >
            {autoToggleEnabled ? (
              <>
                <Pause className="w-3.5 h-3.5 shrink-0" />
                <span>Pause Auto</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 shrink-0" />
                <span>Resume Auto</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onManualFlip}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span>
              Go {connectionStatus === 'Online' ? 'Offline' : 'Online'}
            </span>
          </button>
        </div>

        {/* Interval Selector */}
        <div className="space-y-1.5">
          <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Auto-Toggle Interval
          </span>
          <div
            className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800"
            role="group"
            aria-label="Auto-toggle interval"
          >
            {INTERVAL_CHOICES.map((sec) => {
              const active = intervalSec === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onIntervalChange(sec)}
                  className={`py-1.5 min-h-[34px] rounded-md text-xs font-mono-tabular font-medium transition-colors ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {sec}s
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toggle Event Log */}
      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h3 className="font-display text-xs font-semibold text-slate-900 dark:text-slate-100">
            Toggle Event Log
          </h3>
          <span className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
            ({events.length})
          </span>
        </div>

        <button
          type="button"
          onClick={onClearLog}
          disabled={events.length === 0}
          aria-label="Clear event log"
          className="inline-flex items-center gap-1 px-2 py-1 min-h-[32px] rounded-md text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear</span>
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[280px] lg:max-h-none"
        data-testid="toggle-event-log"
      >
        {events.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No toggle events recorded yet.
          </div>
        ) : (
          events.map((evt) => {
            const wentOnline = evt.nextStatus === 'Online';
            return (
              <div key={evt.id} className="px-4 sm:px-5 py-2.5 space-y-0.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      wentOnline
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    <span>{evt.previousStatus}</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    <span>{evt.nextStatus}</span>
                  </span>
                  <span className="text-[11px] font-mono-tabular text-slate-400 dark:text-slate-500">
                    {evt.timestamp}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  {evt.note}
                </p>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
