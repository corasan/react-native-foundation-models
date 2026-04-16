---
sidebar_position: 3
---

# API Reference

## LanguageModelSession

### Constructor

Creates a new LanguageModelSession instance. Throws an error if Apple Intelligence is not available.

```typescript
constructor(config?: LanguageModelSessionConfig)
```

**Parameters**:
- `config.instructions?: string` - System instructions defining AI behavior
- `config.tools?: ToolDefinition[]` - Array of tools the AI can invoke

### Instance Methods

#### `streamResponse(prompt, callback)`

Initiates a streaming response from the language model.

```typescript
streamResponse(prompt: string, onChunk: (responseSoFar: string) => void): Promise<string>
```

**Parameters**:
- `prompt: string` - The user's message
- `onChunk: (responseSoFar: string) => void` - Called with the full streamed response so far

## Functions

### `checkFoundationModelsAvailability()`

Check if Apple Intelligence is available on the device.

```typescript
function checkFoundationModelsAvailability(): FoundationModelsAvailability
```

**Returns**: Availability status object with `isAvailable`, `status`, and `message`.

## Hooks

### `useLanguageModel(config?)`

React hook for managing language model sessions with automatic lifecycle management.

```typescript
function useLanguageModel(config?: UseLanguageModelConfig): UseLanguageModelReturn
```

**Parameters**:
- `config.instructions?: string` - System instructions for the AI
- `config.tools?: ToolDefinition[]` - Tools the AI can use
- `config.onResponse?: (response: string) => void` - Callback for responses
- `config.onError?: (error: AppleAIError) => void` - Callback for errors

**Returns**:
- `session: LanguageModelSession | null` - Current session instance
- `response: string` - Latest response from the AI
- `loading: boolean` - Whether a request is in progress
- `error: AppleAIError | null` - Last error that occurred
- `send: (prompt: string) => Promise<string>` - Function to send messages
- `reset: () => void` - Reset response and error state
- `isSessionReady: boolean` - Whether session is initialized and ready

### `useStreamingResponse(session)`

Lower-level hook for streaming AI responses with more control.

```typescript
function useStreamingResponse(session: LanguageModelSession): UseStreamingResponseReturn
```

**Parameters**:
- `session: LanguageModelSession` - The session to use for streaming

**Returns**:
- `response: string` - Current response text
- `isStreaming: boolean` - Whether currently streaming
- `isComplete: boolean` - Whether streaming is complete
- `error: AppleAIError | null` - Last error that occurred
- `streamResponse: (prompt: string, options?: StreamingOptions) => Promise<string>` - Start streaming
- `cancel: () => void` - Cancel current stream
- `reset: () => void` - Reset state

## Types

### `FoundationModelsAvailability`

```typescript
interface FoundationModelsAvailability {
  isAvailable: boolean;
  status: AvailabilityStatus;
  message: string;
}
```

### `AvailabilityStatus`

```typescript
type AvailabilityStatus =
  | 'available'
  | 'unavailable.platformNotSupported'
  | 'unavailable.deviceNotEligible'
  | 'unavailable.appleIntelligenceNotEnabled'
  | 'unavailable.modelNotReady'
  | 'unavailable.unknown'
```

### `LanguageModelSessionConfig`

```typescript
interface LanguageModelSessionConfig {
  instructions?: string;
  tools?: ToolDefinition[];
}
```

### `ToolDefinition`

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  arguments: AnyMap;
  handler: (args: AnyMap) => Promise<AnyMap>;
}
```

### `AppleAIError`

```typescript
class AppleAIError extends Error {
  readonly code: string;
  readonly details?: Record<string, any>;

  constructor(code: string, message: string, details?: Record<string, any>);
  static fromErrorInfo(errorInfo: AppleAIErrorInfo): AppleAIError;
  toErrorInfo(): AppleAIErrorInfo;
}
```

#### Error Codes

- `SESSION_NOT_INITIALIZED` - Session is not ready
- `TOOL_CALL_ERROR` - Tool call failed
- `TOOL_EXECUTION_ERROR` - Tool execution failed
- `SCHEMA_CREATION_ERROR` - Failed to create tool schema
- `ARGUMENT_PARSING_ERROR` - Failed to parse tool arguments
- `RESPONSE_PARSING_ERROR` - Failed to parse tool response
- `UNKNOWN_TOOL_ERROR` - Unknown tool referenced
- `SESSION_STREAMING_ERROR` - Streaming failed
- `UNSUPPORTED_PLATFORM` - Platform not supported

### `StreamingOptions`

```typescript
interface StreamingOptions {
  onToken?: (token: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: AppleAIError) => void;
}
```

## Utilities

### `createTool(definition)`

Helper function to create type-safe tools with Zod schema validation.

```typescript
function createTool<T extends ZodObjectSchema>(definition: {
  name: string;
  description: string;
  arguments: T;
  handler: (params: z.infer<T>) => Promise<AnyMap>;
}): ToolDefinition
```

### `isAppleAIError(error)`

Type guard to check if an error is an AppleAIError.

```typescript
function isAppleAIError(error: any): error is AppleAIError
```

### `parseNativeError(error)`

Parse native errors into AppleAIError instances.

```typescript
function parseNativeError(error: any): AppleAIError
```
