import React from 'react';
import { Moon, Pause, Play, Sun } from 'lucide-react';

interface DashboardHeaderProps {
  manualOverride: boolean;
  isDark: boolean;
  onToggleOverride: () => void;
  onToggleTheme: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  manualOverride,
  isDark,
  onToggleOverride,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#overview"
          className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
        >
          <span
            className="w-8 h-8 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M2 12h4l3-7 6 14 3-7h4" />
            </svg>
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            MeshLine
          </span>
        </a>

        {/* Zone 2: Clean single-line text nav links */}
        <nav
          aria-label="Dashboard sections"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <a
            href="#overview"
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Overview
          </a>
          <a
            href="#automation"
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Automation
          </a>
          <a
            href="#event-log"
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Event Log
          </a>
        </nav>

        {/* Zone 3: Primary simulation control + Theme toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleOverride}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
              manualOverride
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950'
            }`}
          >
            {manualOverride ? (
              <>
                <Play className="w-3.5 h-3.5 shrink-0" />
                <span>Resume Auto-Toggle</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 shrink-0" />
                <span>Pause Auto-Toggle</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="min-w-[40px] min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
