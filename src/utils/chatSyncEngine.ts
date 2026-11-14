import type {
  AiChatMessage,
  ConnectionStatus,
  ToggleLogEvent,
} from '../types/chat';

export function formatTimeShort(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function getNextConnectionStatus(
  current: ConnectionStatus
): ConnectionStatus {
  return current === 'Online' ? 'Offline' : 'Online';
}

export function createUserMessage(params: {
  id: string;
  text: string;
  connectionStatus: ConnectionStatus;
  date?: Date;
}): AiChatMessage {
  const isOnline = params.connectionStatus === 'Online';
  return {
    id: params.id,
    role: 'user',
    text: params.text,
    timestamp: formatTimeShort(params.date),
    syncState: isOnline ? 'sending' : 'queued',
  };
}

export function getQueuedMessages(
  messages: readonly AiChatMessage[]
): AiChatMessage[] {
  return messages.filter(
    (msg) => msg.role === 'user' && msg.syncState === 'queued'
  );
}

export function markMessageSyncState(
  messages: readonly AiChatMessage[],
  messageId: string,
  syncState: AiChatMessage['syncState'],
  errorNote?: string
): AiChatMessage[] {
  return messages.map((msg) =>
    msg.id === messageId ? { ...msg, syncState, errorNote } : msg
  );
}

export function createToggleEvent(params: {
  id: string;
  previousStatus: ConnectionStatus;
  nextStatus: ConnectionStatus;
  trigger: 'auto' | 'manual';
  queuedCount: number;
  date?: Date;
}): ToggleLogEvent {
  let note: string;
  if (params.nextStatus === 'Offline') {
    note =
      params.trigger === 'auto'
        ? 'Automatic interval switched connection Offline'
        : 'Manual toggle switched connection Offline';
  } else if (params.queuedCount > 0) {
    note = `${
      params.trigger === 'auto' ? 'Automatic interval' : 'Manual toggle'
    } restored Online · syncing ${params.queuedCount} queued message${
      params.queuedCount === 1 ? '' : 's'
    }`;
  } else {
    note =
      params.trigger === 'auto'
        ? 'Automatic interval restored connection Online'
        : 'Manual toggle restored connection Online';
  }

  return {
    id: params.id,
    timestamp: formatTimeShort(params.date),
    previousStatus: params.previousStatus,
    nextStatus: params.nextStatus,
    trigger: params.trigger,
    note,
  };
}

export function buildApiHistory(
  messages: readonly AiChatMessage[]
): Array<{ role: 'user' | 'model'; text: string }> {
  return messages
    .filter((m) => m.syncState === 'sent' && m.text.trim().length > 0)
    .map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      text: m.text,
    }));
}
