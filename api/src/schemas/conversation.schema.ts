import { z } from 'zod'

export const createConversationSchema = z
  .object({
    level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
    profile: z.enum(['professor', 'bestfriend', 'secretary', 'girlfriend']).optional(),
    model: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    webSearchEnabled: z.boolean().optional().default(false),
  })
  .strict()

export const conversationIdSchema = z
  .object({
    id: z.string().uuid('Invalid conversation ID'),
  })
  .strict()

export type CreateConversationBody = z.infer<typeof createConversationSchema>
export type ConversationIdParameters = z.infer<typeof conversationIdSchema>
