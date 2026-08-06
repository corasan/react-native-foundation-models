import { beforeEach, describe, expect, mock, test } from 'bun:test'

interface NativeSessionMock {
  respond: (prompt: string) => Promise<string>
  streamResponse: (prompt: string, onChunk: (chunk: string) => void) => Promise<string>
  tokenCount: (prompt: string) => Promise<number>
  wasContextReset: boolean
}

let nativeSession: NativeSessionMock
let createSession: () => NativeSessionMock

const factory = {
  isAvailable: true,
  availabilityStatus: 'available',
  contextSize: 4096,
  create: () => createSession(),
}

mock.module('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: () => factory,
  },
}))

mock.module('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
}))

const { AppleAIError } = await import('../src/errors')
const { LanguageModelSession } = await import('../src/LanguageModelSession')

beforeEach(() => {
  nativeSession = {
    respond: async () => 'response',
    streamResponse: async (_prompt, onChunk) => {
      onChunk('partial')
      onChunk('complete')
      return 'complete'
    },
    tokenCount: async () => 3,
    wasContextReset: false,
  }
  createSession = () => nativeSession
})

describe('LanguageModelSession native boundary', () => {
  test('normalizes opaque streaming failures with operation diagnostics', async () => {
    nativeSession.streamResponse = async () => {
      throw new Error('Unknown native C++ error')
    }

    const session = new LanguageModelSession()

    await expect(session.streamResponse('Hello', () => {})).rejects.toMatchObject({
      name: 'AppleAIError',
      code: 'SESSION_STREAMING_ERROR',
      message: 'Unknown native C++ error',
      details: {
        operation: 'streamResponse',
        nativeName: 'Error',
      },
    })
  })

  test('preserves a typed native generation failure', async () => {
    nativeSession.streamResponse = async () => {
      throw new Error('[GUARDRAIL_VIOLATION] The request violated model guardrails')
    }

    const session = new LanguageModelSession()

    await expect(session.streamResponse('Hello', () => {})).rejects.toMatchObject({
      code: 'GUARDRAIL_VIOLATION',
      message: 'The request violated model guardrails',
    })
  })

  test('contains chunk callback exceptions and returns a typed rejection', async () => {
    const session = new LanguageModelSession()

    const result = session.streamResponse('Hello', () => {
      throw new Error('render failed')
    })

    await expect(result).rejects.toMatchObject({
      name: 'AppleAIError',
      code: 'STREAM_CALLBACK_ERROR',
      message: 'Streaming callback failed: render failed',
      details: {
        operation: 'streamResponse.onChunk',
        causeCode: 'UNKNOWN_ERROR',
      },
    })
  })

  test('normalizes non-streaming native failures separately', async () => {
    nativeSession.respond = async () => {
      throw new Error('Unknown native C++ error')
    }

    const session = new LanguageModelSession()

    await expect(session.respond('Hello')).rejects.toMatchObject({
      code: 'SESSION_RESPONSE_ERROR',
      details: { operation: 'respond' },
    })
  })

  test('normalizes synchronous session creation failures', () => {
    createSession = () => {
      throw new Error('Native session creation failed')
    }

    expect(() => new LanguageModelSession()).toThrow(
      expect.objectContaining<Partial<InstanceType<typeof AppleAIError>>>({
        name: 'AppleAIError',
        code: 'SESSION_INITIALIZATION_ERROR',
        details: expect.objectContaining({ operation: 'createSession' }),
      }),
    )
  })
})
