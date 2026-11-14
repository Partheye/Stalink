import React from 'react';
import { ArrowRight, Trash2 } from 'lucide-react';
import type { ConnectionLogEntry, LogFilter } from '../types/connection';

interface LiveEventLogProps {
  entries: ConnectionLogEntry[];
  filter: LogFilter;
  onFilterChange: (filter: LogFilter) => void;
  onClearLog: () => void;
}

const FILTER_TABS: readonly { id: LogFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'transition', label: 'Transitions' },
  { id: 'heartbeat', label: 'Heartbeats' },
  { id: 'override', label: 'Overrides' },
];

export const LiveEventLog: React.FC<LiveEventLogProps> = ({
  entries,
  filter,
  onFilterChange,
  onClearLog,
}) => {
  return (
    <section
      id="event-log"
      aria-labelledby="event-log-heading"
      className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
    >
      {/* Log Header */}
      <div className="p-5 sm:px-6 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <h2
              id="event-log-heading"
              className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Live Event Log
            </h2>
            <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
              {entries.length} {entries.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClearLog}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>Clear Log</span>
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div
          className="flex items-center gap-1 overflow-x-auto pb-0.5"
          role="tablist"
          aria-label="Filter event log entries"
        >
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onFilterChange(tab.id)}
                className={`px-3 py-1.5 min-h-[34px] rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600 ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/70'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Log Entries List */}
      <div
        className="flex-1 max-h-[500px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80"
        data-testid="event-log-list"
      >
        {entries.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              No recorded events
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Wait for the next heartbeat evaluation, run a probe, or switch the
              connection state manually.
            </p>
          </div>
        ) : (
          entries.map((entry) => {
            const stateChanged = entry.previousState !== entry.nextState;
            const isResultOnline = entry.nextState === 'Online';

            return (
              <div
                key={entry.id}
                className="px-5 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400 pt-0.5 shrink-0">
                    {entry.timestamp}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      {stateChanged ? (
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isResultOnline
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          <span>{entry.previousState}</span>
                          <ArrowRight className="w-3 h-3" aria-hidden="true" />
                          <span>{entry.nextState}</span>
                        </span>
                      ) : (
                        <span
                          className={`font-semibold ${
                            isResultOnline
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {entry.nextState}
                        </span>
                      )}

                      <span
                        className="text-slate-300 dark:text-slate-600"
                        aria-hidden="true"
                      >
                        ·
                      </span>

                      <span className="text-slate-500 dark:text-slate-400 capitalize">
                        {entry.category}
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-200 break-words">
                      {entry.reason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-[62px] sm:pl-0 text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400 shrink-0">
                  <span>
                    {entry.latencyMs === null ? 'Timeout' : `${entry.latencyMs} ms`}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{entry.packetLossPct.toFixed(1)}% loss</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
