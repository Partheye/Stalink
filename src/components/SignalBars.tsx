import React from 'react';
import type { SignalProfile } from '../types/messaging';

interface SignalBarsProps {
  profile: SignalProfile;
}

export const SignalBars: React.FC<SignalBarsProps> = ({ profile }) => {
  const heights = [6, 9, 12, 15, 18];

  const activeColorClass =
    profile.tone === 'emerald'
      ? 'bg-emerald-600 dark:bg-emerald-400'
      : profile.tone === 'amber'
        ? 'bg-amber-500 dark:bg-amber-400'
        : 'bg-slate-400 dark:bg-slate-500';

  const inactiveColorClass = 'bg-slate-200 dark:bg-slate-700';

  return (
    <div
      className="flex items-end gap-[3px] h-[18px] shrink-0"
      role="img"
      aria-label={`Signal strength: ${profile.bars} of ${profile.maxBars} bars (${profile.label})`}
      data-testid="signal-bars"
      data-bars={profile.bars}
    >
      {heights.map((heightPx, idx) => {
        const isActive = idx < profile.bars;
        return (
          <span
            key={heightPx}
            style={{ height: `${heightPx}px` }}
            className={`w-[3.5px] rounded-[1.5px] transition-colors duration-200 ${
              isActive ? activeColorClass : inactiveColorClass
            }`}
          />
        );
      })}
    </div>
  );
};
