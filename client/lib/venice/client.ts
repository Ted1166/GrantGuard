import OpenAI from 'openai'

const veniceClient = new OpenAI({
  apiKey: process.env.VENICE_API_KEY ?? '',
  baseURL: process.env.VENICE_API_BASE ?? 'https://api.venice.ai/api/v1',
})

export const VENICE_TEXT_MODEL = 'llama-3.3-70b'

export async function veniceChat(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const response = await veniceClient.chat.completions.create({
    model: VENICE_TEXT_MODEL,
    max_tokens: options?.maxTokens ?? 2048,
    temperature: options?.temperature ?? 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Venice returned empty response')
  return content
}

export async function veniceWebSearch(query: string): Promise<string> {
  const response = await veniceClient.chat.completions.create({
    model: VENICE_TEXT_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Search the web for: ${query}\n\nSummarise what you find in 3-5 sentences.`,
      },
    ],
    // @ts-expect-error Venice-specific extension
    venice_parameters: { enable_web_search: 'on' },
  })

  return response.choices[0]?.message?.content ?? ''
}

export { veniceClient }