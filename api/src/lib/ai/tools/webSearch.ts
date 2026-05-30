import { tavily } from '@tavily/core'
import { tool } from 'ai'
import { z } from 'zod'

export const webSearchTool = tool({
  description:
    'Search the web for up-to-date information on a topic. Use this when you need current events, recent news, or any information that may have changed after your training cutoff.',
  inputSchema: z.object({
    query: z.string().describe('The search query to look up on the web'),
  }),
  execute: async ({ query }: { query: string }) => {
    const apiKey = process.env.TAVILY_API_KEY
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY is not configured')
    }

    const client = tavily({ apiKey })
    const response = await client.search(query, { maxResults: 5, searchDepth: 'basic' })

    return response.results.map(r => ({
      title: r.title,
      url: r.url,
      content: r.content,
    }))
  },
})
