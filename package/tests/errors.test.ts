import { describe, expect, test } from 'bun:test'
import { AppleAIError, isAppleAIError, parseNativeError } from '../src/errors'

describe('parseNativeError', () => {
  test('restores the stable error code embedded by the Swift bridge', () => {
    const error = parseNativeError(
      new Error('[RATE_LIMITED] The model rate-limited the streaming request'),
      { fallbackCode: 'SESSION_STREAMING_ERROR', operation: 'streamResponse' },
    )

    expect(error).toBeInstanceOf(AppleAIError)
    expect(error.code).toBe('RATE_LIMITED')
    expect(error.message).toBe('The model rate-limited the streaming request')
    expect(error.details).toEqual({
      operation: 'streamResponse',
      nativeName: 'Error',
    })
    expect(error.cause).toBeInstanceOf(Error)
  })

  test('assigns an operation-specific fallback to opaque native errors', () => {
    const nativeError = Object.assign(new Error('Unknown native C++ error'), {
      code: 17,
      domain: 'NitroModules',
    })

    const error = parseNativeError(nativeError, {
      fallbackCode: 'SESSION_STREAMING_ERROR',
      operation: 'streamResponse',
    })

    expect(error.code).toBe('SESSION_STREAMING_ERROR')
    expect(error.message).toBe('Unknown native C++ error')
    expect(error.details).toEqual({
      operation: 'streamResponse',
      nativeName: 'Error',
      nativeCode: 17,
      nativeDomain: 'NitroModules',
    })
    expect(() => JSON.stringify(error.toErrorInfo())).not.toThrow()
    expect(error.cause).toBe(nativeError)
  })

  test('does not mistake an arbitrary native error for an AppleAIError', () => {
    const nativeError = { code: 1, message: 'Native failure' }

    expect(isAppleAIError(nativeError)).toBe(false)
    expect(
      parseNativeError(nativeError, { fallbackCode: 'SESSION_RESPONSE_ERROR' }).code,
    ).toBe('SESSION_RESPONSE_ERROR')
  })
})
