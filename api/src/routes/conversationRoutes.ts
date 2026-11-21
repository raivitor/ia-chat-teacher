import { Router } from 'express'

import { conversationController } from '../controllers/conversationController.js'
import { validateBody, validateParameters } from '../middlewares/validation.js'
import { conversationIdSchema, createConversationSchema } from '../schemas/conversation.schema.js'

const conversationRouter = Router()

conversationRouter.get('/', conversationController.list)
conversationRouter.post('/', validateBody(createConversationSchema), conversationController.create)
conversationRouter.get('/:id', validateParameters(conversationIdSchema), conversationController.getById)
conversationRouter.post('/:id/finish', validateParameters(conversationIdSchema), conversationController.finish)
conversationRouter.post('/:id/reopen', validateParameters(conversationIdSchema), conversationController.reopen)
conversationRouter.delete('/:id', validateParameters(conversationIdSchema), conversationController.delete)

export default conversationRouter
