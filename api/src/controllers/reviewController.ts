import type { Request, Response } from 'express'

import { reviewService } from '../services/reviewService.js'

export const reviewController = {
  getUnreviewedCount: async (_req: Request, res: Response) => {
    const count = await reviewService.countUnreviewed()
    return res.status(200).json({ count })
  },

  generate: async (_req: Request, res: Response) => {
    const csv = await reviewService.generateReview()

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="anki-review.txt"')
    return res.status(200).send(csv)
  },
}
