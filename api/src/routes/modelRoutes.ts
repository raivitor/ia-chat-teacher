import { Router } from 'express'

import { AVAILABLE_MODELS, DEFAULT_MODEL, FALLBACK_MODEL, PRODUCTION_RECOMMENDED_MODEL } from '../lib/ai/config.js'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    models: AVAILABLE_MODELS,
    defaultModel: DEFAULT_MODEL,
    fallbackModel: FALLBACK_MODEL,
    productionRecommendedModel: PRODUCTION_RECOMMENDED_MODEL,
    contextWindow: AVAILABLE_MODELS.find(model => model.id === DEFAULT_MODEL)?.contextWindow ?? null,
  })
})

export default router
