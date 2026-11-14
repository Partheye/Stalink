import type { User } from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import type { ChatMessage, ConversationThread } from '../types/messaging';

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
  return cleaned || 'item-1';
}

export async function syncMessagesToCloud(
  user: User,
  items: Array<{ thread: ConversationThread; message: ChatMessage }>
): Promise<void> {
  if (!user.emailVerified || items.length === 0) return;

  const groupedByThread = new Map<
    string,
    { thread: ConversationThread; messages: ChatMessage[] }
  >();

  for (const item of items) {
    const existing = groupedByThread.get(item.thread.id);
    if (existing) {
      existing.messages.push(item.message);
    } else {
      groupedByThread.set(item.thread.id, {
        thread: item.thread,
        messages: [item.message],
      });
    }
  }

  for (const { thread, messages } of groupedByThread.values()) {
    const threadId = sanitizeId(thread.id);
    const threadPath = `users/${user.uid}/threads/${threadId}`;
    const threadRef = doc(db, 'users', user.uid, 'threads', threadId);

    try {
      const existingThreadSnap = await getDoc(threadRef);
      const batch = writeBatch(db);

      if (!existingThreadSnap.exists()) {
        batch.set(threadRef, {
          threadId,
          ownerId: user.uid,
          name: thread.name.slice(0, 120) || 'Contact',
          role: thread.role.slice(0, 120) || 'Mesh Peer',
          relayPath: thread.relayPath.slice(0, 120) || 'Direct BLE',
          prefersSatellite: Boolean(thread.prefersSatellite),
          hopCount: Math.max(0, Math.min(64, Math.floor(thread.hopCount || 0))),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.update(threadRef, {
          name: thread.name.slice(0, 120) || 'Contact',
          role: thread.role.slice(0, 120) || 'Mesh Peer',
          relayPath: thread.relayPath.slice(0, 120) || 'Direct BLE',
          prefersSatellite: Boolean(thread.prefersSatellite),
          hopCount: Math.max(0, Math.min(64, Math.floor(thread.hopCount || 0))),
          updatedAt: serverTimestamp(),
        });
      }

      for (const msg of messages) {
        const messageId = sanitizeId(msg.id);
        const msgRef = doc(
          db,
          'users',
          user.uid,
          'threads',
          threadId,
          'messages',
          messageId
        );
        const existingMsgSnap = await getDoc(msgRef);

        if (!existingMsgSnap.exists()) {
          batch.set(msgRef, {
            messageId,
            threadId,
            ownerId: user.uid,
            sender: msg.sender,
            text: msg.text.slice(0, 4000),
            timestampLabel: msg.timestamp.slice(0, 32) || 'Now',
            dateGroup: msg.dateGroup.slice(0, 32) || 'Today',
            status: msg.status,
            transportHint: msg.transportHint ?? 'Mesh',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else if (existingMsgSnap.data().status !== 'read') {
          batch.update(msgRef, {
            status: msg.status,
            transportHint: msg.transportHint ?? 'Mesh',
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, threadPath);
    }

    // Mirror to backend API endpoint for relational persistence
    try {
      const idToken = await user.getIdToken();
      await fetch('/api/messages/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          thread: {
            externalId: threadId,
            name: thread.name.slice(0, 120),
            role: thread.role.slice(0, 120),
            relayPath: thread.relayPath.slice(0, 120),
            prefersSatellite: Boolean(thread.prefersSatellite),
            hopCount: Math.max(0, Math.min(64, Math.floor(thread.hopCount || 0))),
          },
          messages: messages.map((m) => ({
            externalId: sanitizeId(m.id),
            sender: m.sender,
            senderName: m.senderName ?? null,
            text: m.text.slice(0, 4000),
            timestampLabel: m.timestamp.slice(0, 32),
            dateGroup: m.dateGroup.slice(0, 32),
            status: m.status,
            transportHint: m.transportHint ?? 'Mesh',
          })),
        }),
      });
    } catch (err) {
      console.error('Background relay persistence error:', err);
    }
  }
}

export async function loadPersistedThreads(user: User): Promise<
  Array<{
    threadExternalId: string;
    messages: ChatMessage[];
  }>
> {
  if (!user.emailVerified) return [];

  try {
    const idToken = await user.getIdToken();
    const res = await fetch('/api/threads', {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      threads?: Array<{ id: number; externalId: string }>;
      messages?: Array<{
        threadId: number;
        externalId: string;
        sender: 'me' | 'them';
        senderName: string | null;
        text: string;
        timestampLabel: string;
        dateGroup: string;
        status: 'queued' | 'relayed' | 'delivered' | 'read';
        transportHint: 'Mesh' | 'Satellite' | 'Queue' | null;
      }>;
    };

    const threadIdMap = new Map<number, string>();
    for (const t of data.threads || []) {
      threadIdMap.set(t.id, t.externalId);
    }

    const grouped = new Map<string, ChatMessage[]>();
    for (const m of data.messages || []) {
      const extThreadId = threadIdMap.get(m.threadId);
      if (!extThreadId) continue;
      const list = grouped.get(extThreadId) ?? [];
      list.push({
        id: m.externalId,
        sender: m.sender,
        senderName: m.senderName ?? undefined,
        text: m.text,
        timestamp: m.timestampLabel,
        dateGroup: m.dateGroup,
        status: m.status,
        transportHint: m.transportHint ?? undefined,
      });
      grouped.set(extThreadId, list);
    }

    return Array.from(grouped.entries()).map(([threadExternalId, messages]) => ({
      threadExternalId,
      messages,
    }));
  } catch {
    return [];
  }
}
