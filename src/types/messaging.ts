export type ConnectionMode =
  | 'bluetooth_mesh'
  | 'satellite_burst'
  | 'offline_queue';

export type ConnectionState = 'Online' | 'Offline';

export type DeliveryStatus =
  | 'queued'
  | 'syncing'
  | 'relayed'
  | 'delivered'
  | 'read';

export type ThreadStatus = 'Synced' | 'Pending Relay' | 'Queued for Satellite';

export type ThreadStatusFilter = 'All' | ThreadStatus;

export type AttachmentKind = 'photo' | 'location' | 'voice' | 'document';

export interface MessageAttachment {
  id: string;
  kind: AttachmentKind;
  title: string;
  subtitle: string;
  imageUrl?: string;
  coordinates?: string;
  elevation?: string;
  durationSec?: number;
  fileSize?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'me' | 'them';
  senderName?: string;
  text: string;
  timestamp: string;
  dateGroup: string;
  status: DeliveryStatus;
  wasQueued?: boolean;
  syncedAt?: string;
  transportHint?: 'Mesh' | 'Satellite' | 'Queue';
  attachment?: MessageAttachment;
}

export interface QueueEntry {
  id: string;
  threadId: string;
  recipientName: string;
  text: string;
  attachmentTitle?: string;
  timestamp: string;
  syncedAt?: string;
  byteSize: number;
  status: 'queued' | 'syncing' | 'delivered';
}

export interface ConversationThread {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  initials: string;
  accentColor: string;
  isGroup?: boolean;
  prefersSatellite?: boolean;
  hopCount: number;
  relayPath: string;
  encryptionFingerprint: string;
  unreadCount: number;
  lastTimestamp: string;
  messages: ChatMessage[];
}

export interface SignalProfile {
  mode: ConnectionMode;
  label: string;
  shortLabel: string;
  bars: number;
  maxBars: number;
  detail: string;
  tone: 'emerald' | 'amber' | 'slate';
}
