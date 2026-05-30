import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { isValidLevel } from '../../types/level.js'
import { DEFAULT_PROFILE, isValidProfile } from '../../types/profile.js'

async function readPromptFile(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf8')
  return content.trim()
}

export async function loadPrompt(level: string, profile: string = DEFAULT_PROFILE): Promise<string> {
  if (!isValidLevel(level)) {
    throw new Error(`Invalid CEFR level: "${level}". Must be one of A1, A2, B1, B2, C1, C2.`)
  }

  if (!isValidProfile(profile)) {
    throw new Error(`Invalid profile: "${profile}". Must be one of professor, bestfriend, secretary, girlfriend.`)
  }

  const promptsDirectory = path.join(process.cwd(), 'prompts')
  const [core, profilePart, levelPart] = await Promise.all([
    readPromptFile(path.join(promptsDirectory, 'shared', 'core.md')),
    readPromptFile(path.join(promptsDirectory, 'profiles', `${profile}.md`)),
    readPromptFile(path.join(promptsDirectory, 'levels', `${level}.md`)),
  ])

  return [core, profilePart, levelPart].filter(Boolean).join('\n\n')
}
