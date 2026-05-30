import { Router } from 'express'

import chatRouter from './chatRoutes.js'
import conversationRouter from './conversationRoutes.js'
import itemRouter from './itemRoutes.js'
import modelRouter from './modelRoutes.js'
import reviewRouter from './reviewRoutes.js'

const router = Router()

router.use('/items', itemRouter)
router.use('/conversations', conversationRouter)
router.use('/chat', chatRouter)
router.use('/models', modelRouter)
router.use('/review', reviewRouter)

export default router
