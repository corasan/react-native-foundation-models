import type { AnyMap } from 'react-native-nitro-modules'
import { z } from 'zod'
import {
  ArgumentParsingError,
  parseNativeError,
  ResponseParsingError,
  SchemaCreationError,
} from './errors'
import type { ToolDefinition } from './specs/LanguageModelSession.nitro'

type ZodObjectSchema = z.ZodObject<any>
type InferArgs<T extends ZodObjectSchema> = z.infer<T>

export interface TypeSafeToolDefinition<T extends ZodObjectSchema> {
  name: string
  description: string
  arguments: T
  handler: (args: InferArgs<T>) => Promise<AnyMap>
}

/**
 * Converts a Zod schema to an AnyMap format that the native code can understand
 */
function zodSchemaToAnyMap(schema: z.ZodObject<any>): AnyMap {
  try {
    const anyMap = new Map<string, any>()

    const shape = schema.shape

    for (const [key, zodType] of Object.entries(shape)) {
      try {
        const type = getZodTypeString(zodType as z.ZodTypeAny)
        anyMap.set(key, type)
      } catch (error) {
        throw new SchemaCreationError(
          `Failed to convert property '${key}' to native type`,
          // @ts-expect-error
          { property: key, zodType: zodType.constructor.name, originalError: error },
        )
      }
    }

    // Convert Map to plain object and then to AnyMap
    return Object.fromEntries(anyMap) as AnyMap
  } catch (error) {
    if (error instanceof SchemaCreationError) {
      throw error
    }
    throw new SchemaCreationError('Failed to convert Zod schema to AnyMap', {
      schemaKeys: Object.keys(schema.shape),
      originalError: error,
    })
  }
}

/**
 * Gets the string representation of a Zod type for native code
 */
function getZodTypeString(zodType: z.ZodTypeAny): string {
  let currentType = zodType

  while (true) {
    const definition = currentType._def as {
      type: string
      innerType?: z.ZodTypeAny
    }

    if (
      definition.type !== 'default' &&
      definition.type !== 'optional' &&
      definition.type !== 'nullable' &&
      definition.type !== 'readonly' &&
      definition.type !== 'nonoptional'
    ) {
      break
    }

    if (!definition.innerType) {
      break
    }

    currentType = definition.innerType
  }

  switch (currentType._def.type) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'array':
      return 'array'
    case 'object':
      return 'object'
    case 'enum':
    case 'literal':
      return 'string'
    default:
      return 'string'
  }
}

/**
 * Creates a type-safe tool definition that converts the Zod schema to AnyMap
 */
export function createTool<T extends ZodObjectSchema>(
  definition: TypeSafeToolDefinition<T>,
): ToolDefinition {
  try {
    const argumentsSchema = zodSchemaToAnyMap(definition.arguments)

    return {
      name: definition.name,
      description: definition.description,
      arguments: argumentsSchema,
      handler: async (args: AnyMap) => {
        try {
          // Parse and validate the arguments using Zod
          const parsedArgs = definition.arguments.parse(args)

          // Call the type-safe handler
          const result = await definition.handler(parsedArgs)

          // Validate that result is AnyMap-compatible
          if (result === null || result === undefined) {
            throw new ResponseParsingError('Tool handler returned null or undefined')
          }

          if (typeof result !== 'object') {
            throw new ResponseParsingError(
              `Tool handler must return an object, got ${typeof result}`,
              { returnedType: typeof result, returnedValue: result },
            )
          }

          // Return the result (convert to AnyMap if needed)
          return result as AnyMap
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new ArgumentParsingError(
              `Invalid arguments for tool '${definition.name}'`,
              {
                toolName: definition.name,
                zodErrors: error.issues,
                receivedArgs: args,
              },
            )
          }

          if (
            error instanceof ArgumentParsingError ||
            error instanceof ResponseParsingError
          ) {
            throw error
          }

          // Handle handler errors
          throw parseNativeError(error)
        }
      },
    }
  } catch (error) {
    if (error instanceof SchemaCreationError) {
      throw error
    }
    throw new SchemaCreationError(`Failed to create tool '${definition.name}'`, {
      toolName: definition.name,
      originalError: error,
    })
  }
}
