import type {
  ConnectionLogEntry,
  ConnectionModeState,
  EventCategory,
  LogFilter,
  NetworkEvaluationResult,
  TriggerRule,
} from '../types/connection';

export function formatClockTimestamp(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function formatDurationSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

export function evaluateNetworkConditions(params: {
  currentMode: ConnectionModeState;
  triggerRule: TriggerRule;
  tickCount: number;
  consecutiveFailures: number;
  faultInjected: boolean;
}): NetworkEvaluationResult {
  const {
    currentMode,
    triggerRule,
    tickCount,
    consecutiveFailures,
    faultInjected,
  } = params;

  if (triggerRule === 'interval_cycle') {
    if (faultInjected) {
      return {
        nextMode: 'Offline',
        changed: currentMode !== 'Offline',
        reason:
          currentMode !== 'Offline'
            ? 'Scheduled check detected injected link fault'
            : 'Link fault persists; holding Offline state',
        latencyMs: null,
        packetLossPct: 100,
        signalStrengthPct: 0,
        nextConsecutiveFailures: consecutiveFailures + 1,
      };
    }

    const nextMode: ConnectionModeState =
      currentMode === 'Online' ? 'Offline' : 'Online';
    const latencyMs = nextMode === 'Online' ? 28 + ((tickCount * 7) % 22) : null;
    const packetLossPct = nextMode === 'Online' ? 0.2 : 100;

    return {
      nextMode,
      changed: true,
      reason:
        nextMode === 'Offline'
          ? 'Automatic interval cycle switched connection Offline'
          : 'Automatic interval cycle restored connection Online',
      latencyMs,
      packetLossPct,
      signalStrengthPct: nextMode === 'Online' ? 92 : 0,
      nextConsecutiveFailures: nextMode === 'Offline' ? 1 : 0,
    };
  }

  if (triggerRule === 'heartbeat_threshold') {
    // Periodic simulated degradation every 4th/5th tick unless fault is injected
    const degradedCycle = faultInjected || tickCount % 5 === 3 || tickCount % 5 === 4;

    if (degradedCycle) {
      const nextFailures = consecutiveFailures + 1;
      if (currentMode === 'Online' && nextFailures >= 2) {
        return {
          nextMode: 'Offline',
          changed: true,
          reason: `Heartbeat timeout (${nextFailures} consecutive missed probes)`,
          latencyMs: null,
          packetLossPct: 100,
          signalStrengthPct: 12,
          nextConsecutiveFailures: nextFailures,
        };
      }

      if (currentMode === 'Online') {
        return {
          nextMode: 'Online',
          changed: false,
          reason: `Heartbeat probe missed (${nextFailures}/2 before failover)`,
          latencyMs: 390,
          packetLossPct: 34.5,
          signalStrengthPct: 42,
          nextConsecutiveFailures: nextFailures,
        };
      }

      return {
        nextMode: 'Offline',
        changed: false,
        reason: 'Heartbeat probe failed; remaining Offline',
        latencyMs: null,
        packetLossPct: 100,
        signalStrengthPct: 0,
        nextConsecutiveFailures: nextFailures,
      };
    }

    const latencyMs = 24 + ((tickCount * 11) % 35);
    if (currentMode === 'Offline') {
      return {
        nextMode: 'Online',
        changed: true,
        reason: `Heartbeat probe succeeded (${latencyMs} ms)`,
        latencyMs,
        packetLossPct: 0,
        signalStrengthPct: 94,
        nextConsecutiveFailures: 0,
      };
    }

    return {
      nextMode: 'Online',
      changed: false,
      reason: `Heartbeat probe healthy (${latencyMs} ms)`,
      latencyMs,
      packetLossPct: 0,
      signalStrengthPct: 96,
      nextConsecutiveFailures: 0,
    };
  }

  // triggerRule === 'jitter_spike'
  const hasSpike = faultInjected || tickCount % 4 === 2;
  if (hasSpike) {
    const spikeLoss = faultInjected ? 68.0 : 31.4;
    return {
      nextMode: 'Offline',
      changed: currentMode !== 'Offline',
      reason:
        currentMode !== 'Offline'
          ? `Packet loss spike (${spikeLoss.toFixed(1)}%) triggered auto-disconnect`
          : `Elevated packet loss (${spikeLoss.toFixed(1)}%) persists`,
      latencyMs: 540,
      packetLossPct: spikeLoss,
      signalStrengthPct: 24,
      nextConsecutiveFailures: consecutiveFailures + 1,
    };
  }

  const healthyLatency = 31 + ((tickCount * 9) % 28);
  return {
    nextMode: 'Online',
    changed: currentMode !== 'Online',
    reason:
      currentMode !== 'Online'
        ? `Link jitter stabilized (${healthyLatency} ms, 0.4% loss)`
        : `Link nominal (${healthyLatency} ms, 0.4% loss)`,
    latencyMs: healthyLatency,
    packetLossPct: 0.4,
    signalStrengthPct: 90,
    nextConsecutiveFailures: 0,
  };
}

export function createLogEntry(params: {
  id: string;
  category: EventCategory;
  previousState: ConnectionModeState;
  nextState: ConnectionModeState;
  reason: string;
  latencyMs: number | null;
  packetLossPct: number;
  date?: Date;
}): ConnectionLogEntry {
  return {
    id: params.id,
    timestamp: formatClockTimestamp(params.date),
    category: params.category,
    previousState: params.previousState,
    nextState: params.nextState,
    reason: params.reason,
    latencyMs: params.latencyMs,
    packetLossPct: params.packetLossPct,
  };
}

export function filterLogEntries(
  entries: readonly ConnectionLogEntry[],
  filter: LogFilter
): ConnectionLogEntry[] {
  if (filter === 'all') return [...entries];
  return entries.filter((entry) => entry.category === filter);
}
