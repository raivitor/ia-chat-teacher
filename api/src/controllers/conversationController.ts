import type { Request, Response } from 'express'

import type {
  ConversationIdParameters as ConversationIdParameters,
  CreateConversationBody,
} from '../schemas/conversation.schema.js'
import { conversationService } from '../services/conversationService.js'

export const conversationController = {
  list: async (_req: Request, res: Response) => {
    const conversations = await conversationService.listConversations()
    return res.status(200).json({ conversations })
  },

  create: async (req: Request, res: Response) => {
    const body = req.body as CreateConversationBody
    const conversation = await conversationService.createConversation({
      level: body.level,
      metadata: body.metadata ?? {},
    })
    return res.status(201).json({ conversation })
  },

  getById: async (req: Request, res: Response) => {
    const { id } = req.params as ConversationIdParameters
    const conversation = await conversationService.getConversation(id)

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    return res.status(200).json({ conversation })
  },

  delete: async (req: Request, res: Response) => {
    const { id } = req.params as ConversationIdParameters
    const deleted = await conversationService.deleteConversation(id)

    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    return res.status(200).json({ message: 'Conversation deleted successfully' })
  },
}
