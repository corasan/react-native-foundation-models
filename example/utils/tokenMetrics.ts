export interface TokenMetrics {
  promptTokens: number
  responseTokens: number
  totalTokens: number
}

/**
 * Approximate token count for demo purposes until the native token counter
 * is available on the SDK used by this branch.
 */
export function estimateTokenCount(text: string): number {
  const normalized = text.trim()

  if (!normalized) {
    return 0
  }

  return Math.ceil(normalized.length / 4)
}

export function getTokenMetrics(prompt: string, response: string): TokenMetrics {
  const promptTokens = estimateTokenCount(prompt)
  const responseTokens = estimateTokenCount(response)

  return {
    promptTokens,
    responseTokens,
    totalTokens: promptTokens + responseTokens,
  }
}
