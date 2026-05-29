import { z } from 'zod'

export const chatRequestSchema = z
  .object({
    conversationId: z.string().uuid('Invalid conversation ID'),
    message: z.object({
      role: z.literal('user'),
      content: z.string().min(1, 'Message content cannot be empty'),
    }),
  })
  .strict()

export type ChatRequestBody = z.infer<typeof chatRequestSchema>
