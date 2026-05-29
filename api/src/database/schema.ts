import { sql } from 'drizzle-orm'
import {
  check,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const conversationSeq = pgSequence('conversation_seq', { startWith: 1, increment: 1 })

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    seq: integer('seq').notNull().unique(),
    level: text('level').notNull(),
    model: text('model').notNull(),
    title: text('title').notNull(),
    metadata: jsonb('metadata').notNull().default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    check('conversations_level_check', sql`${table.level} in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')`),
  ],
)

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    parts: jsonb('parts').notNull().default('[]'),
    metadata: jsonb('metadata').notNull().default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [check('messages_role_check', sql`${table.role} in ('user', 'assistant', 'system')`)],
)
