import type { LanguageModelSession } from 'react-native-foundation-models'

export interface TokenMetrics {
  promptTokens: number
  responseTokens: number
  totalTokens: number
  estimated: boolean
}

/**
 * Fallback approximation used on iOS < 26.4 where the native token counter
 * is not available.
 */
export function estimateTokenCount(text: string): number {
  const normalized = text.trim()

  if (!normalized) {
    return 0
  }

  return Math.ceil(normalized.length / 4)
}

export async function getTokenMetrics(
  session: LanguageModelSession,
  prompt: string,
  response: string,
): Promise<TokenMetrics> {
  try {
    const [promptTokens, responseTokens] = await Promise.all([
      session.tokenCount(prompt),
      session.tokenCount(response),
    ])

    return {
      promptTokens,
      responseTokens,
      totalTokens: promptTokens + responseTokens,
      estimated: false,
    }
  } catch {
    const promptTokens = estimateTokenCount(prompt)
    const responseTokens = estimateTokenCount(response)

    return {
      promptTokens,
      responseTokens,
      totalTokens: promptTokens + responseTokens,
      estimated: true,
    }
  }
}
