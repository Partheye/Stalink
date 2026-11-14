import React, { useState, useRef, useEffect } from 'react';
import {
  Bluetooth,
  ChevronDown,
  CloudOff,
  LogIn,
  LogOut,
  Moon,
  RefreshCw,
  Satellite,
  Sun,
} from 'lucide-react';
import type { ConnectionMode, SignalProfile } from '../types/messaging';
import { CONNECTION_MODES } from '../utils/messagingEngine';
import { SignalBars } from './SignalBars';

interface HeaderStatusBarProps {
  mode: ConnectionMode;
  signalProfile: SignalProfile;
  queuedCount: number;
  isDark: boolean;
  userEmail?: string | null;
  userDisplayName?: string | null;
  isSigningIn?: boolean;
  onSelectMode: (mode: ConnectionMode) => void;
  onSyncQueue: () => void;
  onToggleTheme: () => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

const MODE_META: Record<
  ConnectionMode,
  { label: string; Icon: React.FC<{ className?: string }> }
> = {
  bluetooth_mesh: {
    label: 'Local Bluetooth Mesh',
    Icon: Bluetooth,
  },
  satellite_burst: {
    label: 'Satellite Burst Mode',
    Icon: Satellite,
  },
  offline_queue: {
    label: 'Offline Queue',
    Icon: CloudOff,
  },
};

export const HeaderStatusBar: React.FC<HeaderStatusBarProps> = ({
  mode,
  signalProfile,
  queuedCount,
  isDark,
  userEmail,
  userDisplayName,
  isSigningIn = false,
  onSelectMode,
  onSyncQueue,
  onToggleTheme,
  onSignIn,
  onSignOut,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  const ActiveIcon = MODE_META[mode].Icon;
  const canSyncNow = mode !== 'offline_queue' && queuedCount > 0;

  return (
    <header className="relative z-30 shrink-0 h-14 md:h-16 px-3 sm:px-5 bg-white dark:bg-[#111B21] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 sm:gap-6">
      {/* Left: Stalink SVG Brand Logo */}
      <div className="flex items-center shrink-0">
        <div className="flex items-center shrink-0">
          <svg
            viewBox="0 0 116 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Stalink"
            className="h-7 sm:h-8 w-auto select-none block"
          >
            <title>Stalink</title>
            <rect
              x="1"
              y="2"
              width="32"
              height="32"
              rx="8.5"
              className="fill-emerald-600 dark:fill-emerald-500"
            />
            <ellipse
              cx="17"
              cy="18"
              rx="10.5"
              ry="4.5"
              transform="rotate(-32 17 18)"
              stroke="white"
              strokeWidth="1.75"
              strokeOpacity="0.92"
            />
            <path
              d="M9.5 12.2a7 7 0 0 1 6.2-3.7"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeOpacity="0.8"
            />
            <path
              d="M11.5 23.5L22.5 12.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="11.5" cy="23.5" r="2.1" fill="white" />
            <circle cx="22.5" cy="12.5" r="2.1" fill="white" />
            <circle
              cx="17"
              cy="18"
              r="2.4"
              className="fill-emerald-600 dark:fill-emerald-500"
              stroke="white"
              strokeWidth="1.6"
            />
            <text
              x="41"
              y="24.5"
              fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
              fontSize="20.5"
              fontWeight="700"
              letterSpacing="-0.5"
              className="fill-slate-900 dark:fill-slate-100"
            >
              Stalink
            </text>
          </svg>
        </div>
      </div>

      {/* Center: Connection Mode Switcher (Segmented on md+, Dropdown on mobile) */}
      <div className="hidden md:flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#202C33] border border-slate-200/70 dark:border-slate-700/60">
        {CONNECTION_MODES.map((m) => {
          const { label, Icon } = MODE_META[m];
          const isActive = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onSelectMode(m)}
              aria-pressed={isActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600 ${
                isActive
                  ? 'bg-white dark:bg-[#111B21] text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 ${
                  isActive
                    ? m === 'bluetooth_mesh'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : m === 'satellite_burst'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-600 dark:text-slate-300'
                    : 'opacity-70'
                }`}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile Mode Selector */}
      <div className="relative md:hidden flex-1 min-w-0 flex justify-center" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-expanded={mobileMenuOpen}
          aria-haspopup="listbox"
          aria-label={`Connection mode: ${signalProfile.label}. Tap to switch`}
          className="flex items-center gap-1.5 px-2.5 min-h-[40px] max-w-full rounded-lg bg-slate-100 dark:bg-[#202C33] border border-slate-200/80 dark:border-slate-700/70 text-xs font-medium text-slate-900 dark:text-slate-100"
        >
          <ActiveIcon
            className={`w-3.5 h-3.5 shrink-0 ${
              signalProfile.tone === 'emerald'
                ? 'text-emerald-600 dark:text-emerald-400'
                : signalProfile.tone === 'amber'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-400'
            }`}
          />
          <span className="truncate">{signalProfile.shortLabel}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-65" />
        </button>

        {mobileMenuOpen && (
          <div
            role="listbox"
            aria-label="Select connection mode"
            className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-60 rounded-xl bg-white dark:bg-[#202C33] border border-slate-200 dark:border-slate-700 shadow-lg p-1.5 z-50"
          >
            {CONNECTION_MODES.map((m) => {
              const { label, Icon } = MODE_META[m];
              const isSelected = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelectMode(m);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-lg text-left text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Signal Strength Bars + Sync Action + Theme Toggle */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <div
          className="flex items-center gap-2 pr-1"
          data-testid="header-signal-status"
        >
          <SignalBars profile={signalProfile} />
          <div className="hidden xl:flex flex-col leading-tight">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
              {signalProfile.label}
            </span>
            <span className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {signalProfile.detail}
            </span>
          </div>
        </div>

        {canSyncNow && (
          <button
            type="button"
            onClick={onSyncQueue}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Queue ({queuedCount})</span>
          </button>
        )}

        {onSignIn && onSignOut && (
          userEmail ? (
            <button
              type="button"
              onClick={onSignOut}
              aria-label={`Signed in as ${userDisplayName || userEmail}. Sign out`}
              title={`Cloud Backup: ${userEmail}`}
              className="inline-flex items-center gap-1.5 px-2.5 min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#202C33] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/70 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline max-w-[110px] truncate">
                {userDisplayName || userEmail}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              disabled={isSigningIn}
              aria-label="Sign in with Google for cloud backup"
              className="inline-flex items-center gap-1.5 px-2.5 min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#202C33] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/70 disabled:opacity-60 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">
                {isSigningIn ? 'Signing in...' : 'Sign In'}
              </span>
            </button>
          )
        )}

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="min-w-[40px] min-h-[40px] sm:min-w-[38px] sm:min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#202C33] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/70 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
