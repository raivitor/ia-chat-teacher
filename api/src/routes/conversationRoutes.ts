import { Router } from 'express'

import { conversationController } from '../controllers/conversationController.js'
import { validateBody, validateParameters } from '../middlewares/validation.js'
import { conversationIdSchema, createConversationSchema } from '../schemas/conversation.schema.js'

const conversationRouter = Router()

conversationRouter.get('/', conversationController.list)
conversationRouter.post('/', validateBody(createConversationSchema), conversationController.create)
conversationRouter.get('/:id', validateParameters(conversationIdSchema), conversationController.getById)
conversationRouter.delete('/:id', validateParameters(conversationIdSchema), conversationController.delete)

export default conversationRouter
