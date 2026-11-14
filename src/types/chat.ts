export type ConnectionStatus = 'Online' | 'Offline';

export type MessageSyncState = 'sent' | 'queued' | 'sending' | 'failed';

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  syncState: MessageSyncState;
  errorNote?: string;
}

export interface ToggleLogEvent {
  id: string;
  timestamp: string;
  previousStatus: ConnectionStatus;
  nextStatus: ConnectionStatus;
  trigger: 'auto' | 'manual';
  note: string;
}
