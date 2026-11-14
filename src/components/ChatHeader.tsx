import React from 'react';
import { Moon, Sun, Wifi, WifiOff } from 'lucide-react';
import type { ConnectionStatus } from '../types/chat';

interface ChatHeaderProps {
  connectionStatus: ConnectionStatus;
  autoToggleEnabled: boolean;
  secondsUntilToggle: number;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  connectionStatus,
  autoToggleEnabled,
  secondsUntilToggle,
  isDark,
  onToggleTheme,
}) => {
  const isOnline = connectionStatus === 'Online';

  return (
    <header className="shrink-0 h-14 sm:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto h-full flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span
            className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <span className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            MeshLine AI
          </span>
        </div>

        {/* Zone 2 & 3: Connection Badge + Theme Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            data-testid="header-connection-badge"
            data-status={connectionStatus}
            role="status"
            aria-live="polite"
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors duration-200 ${
              isOnline
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{connectionStatus}</span>
            <span
              className="hidden sm:inline opacity-65 font-mono-tabular"
              aria-hidden="true"
            >
              ·
            </span>
            <span className="hidden sm:inline font-mono-tabular opacity-85">
              {autoToggleEnabled ? `Auto in ${secondsUntilToggle}s` : 'Paused'}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="min-w-[40px] min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:focus-visible:outline-slate-100"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
