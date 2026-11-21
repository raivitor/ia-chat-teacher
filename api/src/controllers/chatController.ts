import type { Request, Response } from 'express'

import type { ChatRequestBody } from '../schemas/chat.schema.js'
import { chatService } from '../services/chatService.js'

export const chatController = {
  stream: async (req: Request, res: Response) => {
    const { conversationId, message } = req.body as ChatRequestBody
    const abortController = new AbortController()

    res.on('close', () => {
      if (!res.writableEnded) {
        abortController.abort()
      }
    })

    await chatService.streamResponse(conversationId, message.content, res, abortController.signal)
  },
}
