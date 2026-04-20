import type { AnyMap, HybridObject } from 'react-native-nitro-modules'

export interface ToolDefinition {
  name: string
  description: string
  arguments: AnyMap
  handler: (args: AnyMap) => Promise<AnyMap>
}

export interface LanguageModelSessionConfig {
  instructions?: string
  tools?: Array<ToolDefinition>
  useCase?: string
  guardrails?: string
}

export interface LanguageModelSession extends HybridObject<{ ios: 'swift' }> {
  respond(prompt: string): Promise<string>
  streamResponse(prompt: string, onStream: (stream: string) => void): Promise<string>
  tokenCount(prompt: string): Promise<number>
  readonly wasContextReset: boolean
}

export interface LanguageModelSessionFactory extends HybridObject<{ ios: 'swift' }> {
  create(config: LanguageModelSessionConfig): LanguageModelSession
  readonly isAvailable: boolean
  readonly availabilityStatus: string
  readonly contextSize?: number
}
