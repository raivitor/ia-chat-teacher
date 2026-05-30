import { Router } from 'express'

import { reviewController } from '../controllers/reviewController.js'

const reviewRouter = Router()

reviewRouter.get('/unreviewed-count', reviewController.getUnreviewedCount)
reviewRouter.post('/generate', reviewController.generate)

export default reviewRouter
