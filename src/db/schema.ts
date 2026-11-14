import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const threads = pgTable(
  'threads',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    externalId: text('external_id').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull(),
    relayPath: text('relay_path').notNull(),
    prefersSatellite: boolean('prefers_satellite').default(false).notNull(),
    hopCount: integer('hop_count').default(1).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('threads_user_external_idx').on(table.userId, table.externalId),
  ]
);

export const messages = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    threadId: integer('thread_id')
      .references(() => threads.id)
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    externalId: text('external_id').notNull(),
    sender: text('sender').notNull(),
    senderName: text('sender_name'),
    text: text('text').notNull(),
    timestampLabel: text('timestamp_label').notNull(),
    dateGroup: text('date_group').notNull(),
    status: text('status').notNull(),
    transportHint: text('transport_hint'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('messages_user_external_idx').on(table.userId, table.externalId),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  threads: many(threads),
  messages: many(messages),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  owner: one(users, {
    fields: [threads.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  thread: one(threads, {
    fields: [messages.threadId],
    references: [threads.id],
  }),
  owner: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
}));
