export interface GenerableProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  guide?: {
    description: string
  }
}

export interface GenerableSchema {
  name: string
  properties: Record<string, GenerableProperty>
}

export interface GenerableConfig {
  schemas: GenerableSchema[]
  tools?: Tool[]
  outputPath?: string
  moduleName?: string
}

export interface Tool {
  name: string
  description: string
  arguments: Record<string, GenerableProperty>
  functionName: string
  resultSchema?: Record<string, GenerableProperty>
}

export type SystemLanguageModelUseCase = 'general' | 'contentTagging'

export type SystemLanguageModelGuardrails = 'default' | 'permissiveContentTransformations'

export type FoundationModelsModelFamily = '26.0-26.3' | '26.4+'

export type AvailabilityStatus =
  | 'available'
  | 'unavailable.platformNotSupported'
  | 'unavailable.deviceNotEligible'
  | 'unavailable.appleIntelligenceNotEnabled'
  | 'unavailable.modelNotReady'
  | 'unavailable.unknown'

export interface FoundationModelsAvailability {
  isAvailable: boolean
  status: AvailabilityStatus
  message: string
  contextSize?: number
  modelFamily?: FoundationModelsModelFamily
}
