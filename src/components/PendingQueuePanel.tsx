import React from 'react';
import {
  Archive,
  ArrowLeft,
  CheckCheck,
  Clock,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { ConnectionState, QueueEntry } from '../types/messaging';

interface PendingQueuePanelProps {
  pendingEntries: QueueEntry[];
  syncedEntries: QueueEntry[];
  connectionState: ConnectionState;
  isSyncing: boolean;
  syncProgress: { current: number; total: number } | null;
  onSelectThread: (threadId: string) => void;
  onSyncNow: () => void;
  onClearSyncedHistory: () => void;
  onCloseMobileQueue?: () => void;
}

export const PendingQueuePanel: React.FC<PendingQueuePanelProps> = ({
  pendingEntries,
  syncedEntries,
  connectionState,
  isSyncing,
  syncProgress,
  onSelectThread,
  onSyncNow,
  onClearSyncedHistory,
  onCloseMobileQueue,
}) => {
  const isOnline = connectionState === 'Online';
  const progressPct =
    syncProgress && syncProgress.total > 0
      ? Math.min(
          100,
          Math.round((syncProgress.current / syncProgress.total) * 100)
        )
      : 0;

  return (
    <aside
      aria-label="Store-and-Forward Pending Queue"
      data-testid="pending-queue-panel"
      className="relative z-10 w-full lg:w-[300px] xl:w-[330px] shrink-0 h-full flex flex-col bg-white dark:bg-[#111B21] border-l border-slate-200 dark:border-slate-800"
    >
      {/* Panel Header */}
      <div className="relative z-10 shrink-0 px-4 py-3 bg-white dark:bg-[#111B21] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {onCloseMobileQueue && (
            <button
              type="button"
              onClick={onCloseMobileQueue}
              aria-label="Back to chat"
              className="lg:hidden min-w-[40px] min-h-[40px] -ml-1.5 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              Pending Queue
            </h2>
            <p className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
              {pendingEntries.length === 0
                ? '0 messages waiting'
                : `${pendingEntries.length} stored locally`}
            </p>
          </div>
        </div>

        {isOnline && pendingEntries.length > 0 && !isSyncing && (
          <button
            type="button"
            onClick={onSyncNow}
            className="inline-flex items-center gap-1.5 px-2.5 min-h-[34px] rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Flush Queue</span>
          </button>
        )}
      </div>

      {/* Animated Sync Progress Strip */}
      {isSyncing && syncProgress && (
        <div
          data-testid="queue-sync-progress"
          className="shrink-0 px-4 py-2.5 bg-emerald-50/90 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800/70 space-y-1.5 transition-opacity duration-200"
        >
          <div className="flex items-center justify-between text-xs font-medium text-emerald-900 dark:text-emerald-200">
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>Processing queue...</span>
            </span>
            <span className="font-mono-tabular">
              {syncProgress.current}/{syncProgress.total}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-emerald-200/80 dark:bg-emerald-900/70 overflow-hidden">
            <div
              className="h-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Queue Items Stream */}
      <div className="relative flex-1 overflow-y-auto overscroll-contain p-3.5 space-y-4">
        {pendingEntries.length === 0 && syncedEntries.length === 0 ? (
          <div className="py-10 px-3 text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 dark:bg-[#202C33] text-slate-500 dark:text-slate-400 flex items-center justify-center mb-3">
              <Archive className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Store-and-Forward Queue Empty
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Switch to Offline and send a message to see it stored locally here
              and auto-synced on reconnect.
            </p>
          </div>
        ) : (
          <>
            {pendingEntries.length > 0 && (
              <section aria-label="Queued messages awaiting network">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Waiting for Connection
                  </h3>
                  <span className="text-[11px] font-mono-tabular text-amber-700 dark:text-amber-300">
                    {pendingEntries.length} queued
                  </span>
                </div>

                <div className="space-y-2">
                  {pendingEntries.map((item) => {
                    const itemSyncing = item.status === 'syncing';
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectThread(item.threadId)}
                        data-testid={`pending-queue-item-${item.id}`}
                        className={`w-full text-left p-3 rounded-lg border transition-colors duration-200 ${
                          itemSyncing
                            ? 'bg-emerald-50 dark:bg-emerald-950/35 border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-400/40'
                            : 'bg-amber-50/55 dark:bg-[#19242B] border-amber-200/90 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-[#202C33]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            To: {item.recipientName}
                          </span>
                          <span className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400 shrink-0">
                            {item.timestamp}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-700 dark:text-slate-200 line-clamp-2 break-words">
                          {item.text || `[${item.attachmentTitle}]`}
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                          {itemSyncing ? (
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
                              <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                              <span>Syncing...</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>Queued / Stored Locally</span>
                            </span>
                          )}
                          <span className="font-mono-tabular text-slate-500 dark:text-slate-400 shrink-0">
                            {item.byteSize} B
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {syncedEntries.length > 0 && (
              <section aria-label="Recently synced from queue">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Delivered from Queue
                  </h3>
                  <button
                    type="button"
                    onClick={onClearSyncedHistory}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {syncedEntries.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectThread(item.threadId)}
                      data-testid={`synced-queue-item-${item.id}`}
                      className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-[#19242B] hover:bg-slate-100/70 dark:hover:bg-[#202C33] transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          To: {item.recipientName}
                        </span>
                        <span className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400 shrink-0">
                          {item.syncedAt || item.timestamp}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 break-words">
                        {item.text || `[${item.attachmentTitle}]`}
                      </p>

                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
                          <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Synced / Delivered</span>
                        </span>
                        <span className="font-mono-tabular text-slate-500 dark:text-slate-400 shrink-0">
                          {item.byteSize} B
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
