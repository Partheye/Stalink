import React from 'react';
import { Check, CheckCheck, Clock, RefreshCw } from 'lucide-react';
import type { DeliveryStatus } from '../types/messaging';

interface DeliveryCheckmarkProps {
  status: DeliveryStatus;
  className?: string;
}

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  queued: 'Queued / Stored Locally',
  syncing: 'Syncing queued message',
  relayed: 'Relayed to mesh or satellite',
  delivered: 'Delivered to recipient',
  read: 'Read by recipient',
};

export const DeliveryCheckmark: React.FC<DeliveryCheckmarkProps> = ({
  status,
  className = '',
}) => {
  const label = STATUS_LABELS[status];

  if (status === 'queued') {
    return (
      <span
        className={`inline-flex items-center text-amber-600 dark:text-amber-300 ${className}`}
        title={label}
        aria-label={label}
      >
        <Clock className="w-3.5 h-3.5" strokeWidth={2.2} />
      </span>
    );
  }

  if (status === 'syncing') {
    return (
      <span
        className={`inline-flex items-center text-emerald-700 dark:text-emerald-300 ${className}`}
        title={label}
        aria-label={label}
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={2.2} />
      </span>
    );
  }

  if (status === 'relayed') {
    return (
      <span
        className={`inline-flex items-center text-slate-600 dark:text-slate-200/90 ${className}`}
        title={label}
        aria-label={label}
      >
        <Check className="w-3.5 h-3.5" strokeWidth={2.3} />
      </span>
    );
  }

  if (status === 'delivered') {
    return (
      <span
        className={`inline-flex items-center text-emerald-700 dark:text-emerald-300 ${className}`}
        title={label}
        aria-label={label}
      >
        <CheckCheck className="w-3.5 h-3.5" strokeWidth={2.2} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center text-sky-600 dark:text-sky-300 ${className}`}
      title={label}
      aria-label={label}
    >
      <CheckCheck className="w-3.5 h-3.5" strokeWidth={2.3} />
    </span>
  );
};
