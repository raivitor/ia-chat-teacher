import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { isValidLevel } from '../../types/level.js'

export async function loadPrompt(level: string): Promise<string> {
  if (!isValidLevel(level)) {
    throw new Error(`Invalid CEFR level: "${level}". Must be one of A1, A2, B1, B2, C1, C2.`)
  }

  const promptPath = path.join(process.cwd(), 'prompts', `${level}.md`)
  const content = await readFile(promptPath, 'utf8')
  return content
}
