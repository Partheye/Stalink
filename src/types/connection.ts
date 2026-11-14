export type ConnectionModeState = 'Online' | 'Offline';

export type TriggerRule =
  | 'interval_cycle'
  | 'heartbeat_threshold'
  | 'jitter_spike';

export type EventCategory = 'transition' | 'heartbeat' | 'override';

export type LogFilter = 'all' | EventCategory;

export interface ConnectionLogEntry {
  id: string;
  timestamp: string;
  category: EventCategory;
  previousState: ConnectionModeState;
  nextState: ConnectionModeState;
  reason: string;
  latencyMs: number | null;
  packetLossPct: number;
}

export interface NetworkEvaluationResult {
  nextMode: ConnectionModeState;
  changed: boolean;
  reason: string;
  latencyMs: number | null;
  packetLossPct: number;
  signalStrengthPct: number;
  nextConsecutiveFailures: number;
}
