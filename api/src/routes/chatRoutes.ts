import { Router } from 'express'

import { chatController } from '../controllers/chatController.js'
import { validateBody } from '../middlewares/validation.js'
import { chatRequestSchema } from '../schemas/chat.schema.js'

const chatRouter = Router()

chatRouter.post('/', validateBody(chatRequestSchema), chatController.stream)

export default chatRouter
