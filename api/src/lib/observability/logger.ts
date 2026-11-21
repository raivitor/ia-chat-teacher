type LogLevel = 'info' | 'warn' | 'error'

type LogFields = Record<string, unknown>

function write(level: LogLevel, event: string, fields: LogFields = {}): void {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  }

  if (level === 'error') {
    console.error(JSON.stringify(payload))
    return
  }

  if (level === 'warn') {
    console.warn(JSON.stringify(payload))
    return
  }

  process.stdout.write(`${JSON.stringify(payload)}\n`)
}

export const logger = {
  warn(event: string, fields?: LogFields) {
    write('warn', event, fields)
  },
  error(event: string, fields?: LogFields) {
    write('error', event, fields)
  },
  info(event: string, fields?: LogFields) {
    write('info', event, fields)
  },
}
