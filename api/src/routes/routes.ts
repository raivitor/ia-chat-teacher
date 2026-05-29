import { Router } from 'express'

import chatRouter from './chatRoutes.js'
import conversationRouter from './conversationRoutes.js'
import itemRouter from './itemRoutes.js'
import modelRouter from './modelRoutes.js'

const router = Router()

router.use('/items', itemRouter)
router.use('/conversations', conversationRouter)
router.use('/chat', chatRouter)
router.use('/models', modelRouter)

export default router
