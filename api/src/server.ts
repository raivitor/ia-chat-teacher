import { sql } from 'drizzle-orm'

import app from './app.js'
import { db, pool } from './database/client.js'
import { logger } from './lib/observability/logger.js'

const PORT = process.env.PORT || 3000

try {
  await db.execute(sql`SELECT 1`)
  logger.info('server.db.connected')

  const server = app.listen(PORT, () => {
    logger.info('server.started', { port: PORT })
  })

  let isShuttingDown = false
  const shutdown = (signal: string) => {
    if (isShuttingDown) return
    isShuttingDown = true

    logger.info('server.shutdown.start', { signal })
    server.close(() => {
      void pool
        .end()
        .then(() => {
          logger.info('server.shutdown.complete', { signal })
          process.exitCode = 0
        })
        .catch((error: unknown) => {
          logger.error('server.shutdown.error', {
            signal,
            error: error instanceof Error ? error.message : String(error),
          })
          process.exitCode = 1
        })
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
} catch (error) {
  console.error('Failed to connect to database or start server:', error)
  throw error
}
