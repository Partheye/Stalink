import type {
  ChatMessage,
  ConnectionMode,
  ConnectionState,
  ConversationThread,
  DeliveryStatus,
  QueueEntry,
  SignalProfile,
  ThreadStatus,
  ThreadStatusFilter,
} from '../types/messaging';

export const AUTO_TOGGLE_INTERVAL_SEC = 15;

export const CONNECTION_MODES: readonly ConnectionMode[] = [
  'bluetooth_mesh',
  'satellite_burst',
  'offline_queue',
] as const;

export function modeToConnectionState(mode: ConnectionMode): ConnectionState {
  return mode === 'offline_queue' ? 'Offline' : 'Online';
}

export function connectionStateToMode(
  state: ConnectionState,
  preferredOnlineMode: Exclude<ConnectionMode, 'offline_queue'> = 'bluetooth_mesh'
): ConnectionMode {
  return state === 'Offline' ? 'offline_queue' : preferredOnlineMode;
}

export function getNextConnectionState(current: ConnectionState): ConnectionState {
  return current === 'Online' ? 'Offline' : 'Online';
}

export function getSignalProfile(
  mode: ConnectionMode,
  queuedCount: number
): SignalProfile {
  switch (mode) {
    case 'bluetooth_mesh':
      return {
        mode,
        label: 'Local Bluetooth Mesh',
        shortLabel: 'Local Mesh',
        bars: 4,
        maxBars: 5,
        detail: '3 nearby peers · 2 hops',
        tone: 'emerald',
      };
    case 'satellite_burst':
      return {
        mode,
        label: 'Satellite Burst Mode',
        shortLabel: 'Satellite Burst',
        bars: 2,
        maxBars: 5,
        detail: 'LEO pass · 1.2 kbps burst',
        tone: 'amber',
      };
    case 'offline_queue':
      return {
        mode,
        label: 'Offline (No Network)',
        shortLabel: 'No Network',
        bars: 0,
        maxBars: 5,
        detail:
          queuedCount > 0
            ? `${queuedCount} packet${queuedCount === 1 ? '' : 's'} stored locally`
            : 'Store & forward ready',
        tone: 'slate',
      };
  }
}

export function deriveThreadStatus(thread: ConversationThread): ThreadStatus {
  const outgoing = thread.messages.filter((m) => m.sender === 'me');
  const hasQueued = outgoing.some(
    (m) => m.status === 'queued' || m.status === 'syncing'
  );
  const hasRelayedOnly = outgoing.some((m) => m.status === 'relayed');

  if (hasQueued || hasRelayedOnly) {
    return thread.prefersSatellite ? 'Queued for Satellite' : 'Pending Relay';
  }
  return 'Synced';
}

export function countQueuedMessagesInThread(thread: ConversationThread): number {
  return thread.messages.filter(
    (m) =>
      m.sender === 'me' && (m.status === 'queued' || m.status === 'syncing')
  ).length;
}

export function countTotalQueuedMessages(
  threads: readonly ConversationThread[]
): number {
  return threads.reduce((sum, t) => sum + countQueuedMessagesInThread(t), 0);
}

export function estimatePayloadBytes(
  text: string,
  attachmentTitle?: string
): number {
  const raw = `${text}${attachmentTitle ? `|${attachmentTitle}` : ''}`;
  if (typeof TextEncoder !== 'undefined') {
    return Math.max(16, new TextEncoder().encode(raw).length + 24);
  }
  return Math.max(16, raw.length + 24);
}

export function extractPendingQueueEntries(
  threads: readonly ConversationThread[]
): QueueEntry[] {
  const entries: QueueEntry[] = [];
  for (const thread of threads) {
    for (const msg of thread.messages) {
      if (
        msg.sender === 'me' &&
        (msg.status === 'queued' || msg.status === 'syncing')
      ) {
        entries.push({
          id: msg.id,
          threadId: thread.id,
          recipientName: thread.name,
          text: msg.text,
          attachmentTitle: msg.attachment?.title,
          timestamp: msg.timestamp,
          byteSize: estimatePayloadBytes(msg.text, msg.attachment?.title),
          status: msg.status === 'syncing' ? 'syncing' : 'queued',
        });
      }
    }
  }
  return entries;
}

export function extractSyncedFromQueueEntries(
  threads: readonly ConversationThread[]
): QueueEntry[] {
  const entries: QueueEntry[] = [];
  for (const thread of threads) {
    for (const msg of thread.messages) {
      if (msg.sender === 'me' && msg.wasQueued && msg.status === 'delivered') {
        entries.push({
          id: msg.id,
          threadId: thread.id,
          recipientName: thread.name,
          text: msg.text,
          attachmentTitle: msg.attachment?.title,
          timestamp: msg.timestamp,
          syncedAt: msg.syncedAt,
          byteSize: estimatePayloadBytes(msg.text, msg.attachment?.title),
          status: 'delivered',
        });
      }
    }
  }
  return entries;
}

export function getDeliveryStatusForNewMessage(
  mode: ConnectionMode,
  prefersSatellite?: boolean
): {
  status: DeliveryStatus;
  transportHint: ChatMessage['transportHint'];
  wasQueued: boolean;
} {
  if (mode === 'offline_queue') {
    return { status: 'queued', transportHint: 'Queue', wasQueued: true };
  }
  if (mode === 'satellite_burst') {
    return {
      status: 'delivered',
      transportHint: 'Satellite',
      wasQueued: false,
    };
  }
  if (prefersSatellite) {
    return { status: 'delivered', transportHint: 'Mesh', wasQueued: false };
  }
  return { status: 'delivered', transportHint: 'Mesh', wasQueued: false };
}

export function updateMessageQueueStatus(
  threads: readonly ConversationThread[],
  messageId: string,
  nextStatus: 'queued' | 'syncing' | 'delivered',
  transport: 'Mesh' | 'Satellite' | 'Queue' = 'Mesh',
  syncedAt?: string
): {
  threads: ConversationThread[];
  updatedItem: { thread: ConversationThread; message: ChatMessage } | null;
} {
  let updatedItem: { thread: ConversationThread; message: ChatMessage } | null =
    null;

  const updated = threads.map((thread) => {
    let changed = false;
    const nextMessages = thread.messages.map((msg) => {
      if (msg.id !== messageId) return msg;
      changed = true;
      const nextMsg: ChatMessage = {
        ...msg,
        status: nextStatus,
        wasQueued: msg.wasQueued ?? true,
        transportHint:
          nextStatus === 'queued'
            ? 'Queue'
            : thread.prefersSatellite
              ? 'Satellite'
              : transport,
        ...(syncedAt ? { syncedAt } : {}),
      };
      updatedItem = { thread, message: nextMsg };
      return nextMsg;
    });

    return changed ? { ...thread, messages: nextMessages } : thread;
  });

  return { threads: updated, updatedItem };
}

export function rollbackSyncingMessages(
  threads: readonly ConversationThread[]
): ConversationThread[] {
  return threads.map((thread) => {
    const hasSyncing = thread.messages.some((m) => m.status === 'syncing');
    if (!hasSyncing) return thread;
    return {
      ...thread,
      messages: thread.messages.map((m) =>
        m.status === 'syncing'
          ? { ...m, status: 'queued' as DeliveryStatus, transportHint: 'Queue' }
          : m
      ),
    };
  });
}

export function clearSyncedQueueFlags(
  threads: readonly ConversationThread[]
): ConversationThread[] {
  return threads.map((thread) => {
    const hasFlags = thread.messages.some((m) => m.wasQueued && m.status === 'delivered');
    if (!hasFlags) return thread;
    return {
      ...thread,
      messages: thread.messages.map((m) =>
        m.wasQueued && m.status === 'delivered'
          ? { ...m, wasQueued: false }
          : m
      ),
    };
  });
}

export function flushMessagesForMode(
  threads: readonly ConversationThread[],
  mode: ConnectionMode
): { threads: ConversationThread[]; flushedCount: number } {
  if (mode === 'offline_queue') {
    return { threads: [...threads], flushedCount: 0 };
  }

  let flushedCount = 0;

  const updated = threads.map((thread) => {
    let threadChanged = false;
    const nextMessages = thread.messages.map((msg) => {
      if (msg.sender !== 'me') return msg;

      if (mode === 'bluetooth_mesh') {
        if (
          !thread.prefersSatellite &&
          (msg.status === 'queued' ||
            msg.status === 'syncing' ||
            msg.status === 'relayed')
        ) {
          flushedCount += 1;
          threadChanged = true;
          return {
            ...msg,
            status: 'delivered' as DeliveryStatus,
            transportHint: 'Mesh' as const,
          };
        }
        if (thread.prefersSatellite && (msg.status === 'queued' || msg.status === 'syncing')) {
          flushedCount += 1;
          threadChanged = true;
          return {
            ...msg,
            status: 'relayed' as DeliveryStatus,
            transportHint: 'Mesh' as const,
          };
        }
      }

      if (mode === 'satellite_burst') {
        if (
          msg.status === 'queued' ||
          msg.status === 'syncing' ||
          msg.status === 'relayed'
        ) {
          flushedCount += 1;
          threadChanged = true;
          return {
            ...msg,
            status: 'delivered' as DeliveryStatus,
            transportHint: 'Satellite' as const,
          };
        }
      }

      return msg;
    });

    return threadChanged ? { ...thread, messages: nextMessages } : thread;
  });

  return { threads: updated, flushedCount };
}

export function syncQueuedMessagesOnReconnect(
  threads: readonly ConversationThread[],
  targetStatus: 'relayed' | 'delivered' = 'delivered',
  transport: 'Mesh' | 'Satellite' = 'Mesh'
): {
  threads: ConversationThread[];
  syncedItems: Array<{ thread: ConversationThread; message: ChatMessage }>;
} {
  const syncedItems: Array<{ thread: ConversationThread; message: ChatMessage }> =
    [];

  const updated = threads.map((thread) => {
    let changed = false;
    const nextMessages = thread.messages.map((msg) => {
      if (
        msg.sender === 'me' &&
        (msg.status === 'queued' ||
          msg.status === 'syncing' ||
          (targetStatus === 'delivered' && msg.status === 'relayed'))
      ) {
        changed = true;
        const nextMsg: ChatMessage = {
          ...msg,
          status: targetStatus,
          wasQueued: msg.wasQueued ?? msg.status === 'queued',
          transportHint: thread.prefersSatellite ? 'Satellite' : transport,
        };
        syncedItems.push({ thread, message: nextMsg });
        return nextMsg;
      }
      return msg;
    });

    return changed ? { ...thread, messages: nextMessages } : thread;
  });

  return { threads: updated, syncedItems };
}

export function filterThreads(
  threads: readonly ConversationThread[],
  searchQuery: string,
  statusFilter: ThreadStatusFilter
): ConversationThread[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return threads.filter((thread) => {
    const derivedStatus = deriveThreadStatus(thread);
    if (statusFilter !== 'All' && derivedStatus !== statusFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const matchesMeta =
      thread.name.toLowerCase().includes(normalizedQuery) ||
      thread.role.toLowerCase().includes(normalizedQuery) ||
      derivedStatus.toLowerCase().includes(normalizedQuery);

    if (matchesMeta) {
      return true;
    }

    return thread.messages.some(
      (msg) =>
        msg.text.toLowerCase().includes(normalizedQuery) ||
        msg.attachment?.title.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function formatCurrentClockTime(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
