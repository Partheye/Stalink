import React, { useState } from 'react';
import { Users } from 'lucide-react';

interface AvatarProps {
  name: string;
  initials: string;
  avatarUrl?: string;
  accentColor: string;
  isGroup?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  initials,
  avatarUrl,
  accentColor,
  isGroup = false,
  size = 'md',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const sizeClass =
    size === 'sm'
      ? 'w-9 h-9 text-xs'
      : size === 'lg'
        ? 'w-11 h-11 text-sm'
        : 'w-10 h-10 text-xs';

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-full object-cover shrink-0 border border-slate-200/80 dark:border-slate-700/80`}
      />
    );
  }

  return (
    <div
      style={{ backgroundColor: accentColor }}
      className={`${sizeClass} rounded-full flex items-center justify-center font-display font-semibold text-white shrink-0 select-none`}
      aria-hidden="true"
    >
      {isGroup ? <Users className="w-4 h-4" /> : initials}
    </div>
  );
};
