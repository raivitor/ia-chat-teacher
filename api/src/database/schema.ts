import { sql } from 'drizzle-orm'
import { boolean, check, index, integer, jsonb, pgSequence, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const conversationSeq = pgSequence('conversation_seq', { startWith: 1, increment: 1 })

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    seq: integer('seq').notNull().unique(),
    level: text('level').notNull(),
    profile: text('profile').notNull().default('professor'),
    model: text('model').notNull(),
    title: text('title').notNull(),
    metadata: jsonb('metadata').notNull().default('{}'),
    webSearchEnabled: boolean('web_search_enabled').notNull().default(false),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    check('conversations_level_check', sql`${table.level} in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')`),
    check(
      'conversations_profile_check',
      sql`${table.profile} in ('professor', 'bestfriend', 'secretary', 'girlfriend')`,
    ),
    index('conversations_created_at_idx').on(table.createdAt),
    index('conversations_review_queue_idx').on(table.finishedAt, table.reviewedAt),
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
  table => [
    check('messages_role_check', sql`${table.role} in ('user', 'assistant', 'system')`),
    index('messages_conversation_created_at_idx').on(table.conversationId, table.createdAt),
  ],
)
