import { and, asc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { messages, threads } from './schema.ts';

export interface SyncThreadPayload {
  externalId: string;
  name: string;
  role: string;
  relayPath: string;
  prefersSatellite: boolean;
  hopCount: number;
}

export interface SyncMessagePayload {
  externalId: string;
  sender: 'me' | 'them';
  senderName?: string | null;
  text: string;
  timestampLabel: string;
  dateGroup: string;
  status: 'queued' | 'relayed' | 'delivered' | 'read';
  transportHint?: 'Mesh' | 'Satellite' | 'Queue' | null;
}

export async function getUserMessagesByThread(userId: number) {
  try {
    const userThreads = await db
      .select()
      .from(threads)
      .where(eq(threads.userId, userId))
      .orderBy(asc(threads.id));

    const userMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.userId, userId))
      .orderBy(asc(messages.id));

    return { threads: userThreads, messages: userMessages };
  } catch (error) {
    console.error('Database query failed in getUserMessagesByThread:', error);
    throw new Error('Failed to load synchronized messages.', { cause: error });
  }
}

export async function upsertThreadAndMessages(
  userId: number,
  threadData: SyncThreadPayload,
  messagePayloads: SyncMessagePayload[]
) {
  try {
    const existingThreads = await db
      .select()
      .from(threads)
      .where(
        and(
          eq(threads.userId, userId),
          eq(threads.externalId, threadData.externalId)
        )
      );

    let threadRow = existingThreads[0];
    if (!threadRow) {
      const inserted = await db
        .insert(threads)
        .values({
          userId,
          externalId: threadData.externalId,
          name: threadData.name.slice(0, 120),
          role: threadData.role.slice(0, 120),
          relayPath: threadData.relayPath.slice(0, 120),
          prefersSatellite: Boolean(threadData.prefersSatellite),
          hopCount: Math.max(0, Math.min(64, Number(threadData.hopCount) || 0)),
        })
        .onConflictDoUpdate({
          target: [threads.userId, threads.externalId],
          set: {
            name: threadData.name.slice(0, 120),
            role: threadData.role.slice(0, 120),
            relayPath: threadData.relayPath.slice(0, 120),
            prefersSatellite: Boolean(threadData.prefersSatellite),
            updatedAt: new Date(),
          },
        })
        .returning();
      threadRow = inserted[0];
    }

    const syncedIds: string[] = [];
    for (const msg of messagePayloads) {
      await db
        .insert(messages)
        .values({
          threadId: threadRow.id,
          userId,
          externalId: msg.externalId.slice(0, 128),
          sender: msg.sender,
          senderName: msg.senderName ? msg.senderName.slice(0, 120) : null,
          text: msg.text.slice(0, 4000),
          timestampLabel: msg.timestampLabel.slice(0, 32),
          dateGroup: msg.dateGroup.slice(0, 32),
          status: msg.status,
          transportHint: msg.transportHint ?? null,
        })
        .onConflictDoUpdate({
          target: [messages.userId, messages.externalId],
          set: {
            status: msg.status,
            transportHint: msg.transportHint ?? null,
            updatedAt: new Date(),
          },
        });
      syncedIds.push(msg.externalId);
    }

    return { threadId: threadRow.id, syncedCount: syncedIds.length };
  } catch (error) {
    console.error('Database write failed in upsertThreadAndMessages:', error);
    throw new Error('Failed to synchronize queued messages.', { cause: error });
  }
}
