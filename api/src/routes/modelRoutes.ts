import { Router } from 'express'

import { AVAILABLE_MODELS, DEFAULT_MODEL } from '../lib/ai/config.js'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    models: AVAILABLE_MODELS,
    defaultModel: DEFAULT_MODEL,
  })
})

export default router
