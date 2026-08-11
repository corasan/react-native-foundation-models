# OSS-9: Truthful Tool Schema and Value Contract — Design

**Ticket:** [OSS-9](https://linear.app/henry-pl-llc/issue/OSS-9) · **Date:** 2026-08-11

## Problem

`createTool` accepts rich Zod schemas, but the wire format between TypeScript and
Swift is a flat `{ key: "typename" }` map. This causes:

- Unsupported schema kinds silently coerce to `"string"`.
- Every property becomes required; optionality is lost.
- Enum cases, literals, constraints, and descriptions are lost.
- Nested argument objects are stringified; `null` becomes `""`.
- Structured (nested/array/null) tool-result fields are silently dropped.

## Approaches considered

1. **JSON Schema wire format with recursive conversion (chosen).** TypeScript
   emits a JSON Schema document via Zod 4's built-in `z.toJSONSchema()`. Swift
   recursively builds `DynamicGenerationSchema` from it. Values convert
   recursively in both directions via `GeneratedContent.Kind`.
2. **Reject-only.** Keep the flat format and reject everything beyond flat
   string/number/boolean. Safe but removes capability the API advertises.
3. **Bespoke tagged tree format.** Same power as (1) with more custom code and
   no standard to lean on. Rejected.

Approach (1) is what the ticket recommends. Zod itself states the contract, so
the model-facing schema and the Zod validation schema cannot drift.

## Design

### Wire format

`ToolDefinition.arguments` (an `AnyMap`, no Nitro spec change) now carries a
JSON Schema document produced by
`z.toJSONSchema(schema, { io: 'input' })`. `AnyMap` supports nested objects,
arrays, and `null`, so the document crosses the bridge losslessly. Both
endpoints ship in the same npm package and upgrade atomically.

### Supported subset

| Zod construct | JSON Schema | Foundation Models mapping |
|---|---|---|
| `z.object` | `type: object`, `properties`, `required` | `DynamicGenerationSchema(name:properties:)`, per-property `isOptional` |
| `z.string` | `type: string` | `String.self` |
| `z.number` | `type: number` (+`minimum`/`maximum`) | `Double.self` + range guides |
| `z.int` / `.int()` | `type: integer` (+`minimum`/`maximum`) | `Int.self` + range guides |
| `z.boolean` | `type: boolean` | `Bool.self` |
| `z.array` | `type: array` (+`minItems`/`maxItems`) | `init(arrayOf:minimumElements:maximumElements:)` |
| `z.enum` (strings) | `enum: [...]` | `init(anyOf: [String])` |
| `z.literal` (string) | `const: "..."` | `init(anyOf:)` with one choice |
| `.optional()` / `.nullish()` / `.default()` | key absent from `required` | `Property(isOptional: true)` |
| `.describe()` | `description` | `description` parameters |

Everything else — bare `.nullable()` on a required key, non-string enums and
literals, unions, records, tuples, intersections, string `format`/`pattern`,
`exclusiveMinimum`/`exclusiveMaximum`, `multipleOf` — **fails at `createTool`
time** with a `SchemaCreationError` that names the property path, the
unsupported construct, and the supported alternative.

Rationale for rejecting bare `.nullable()`: `DynamicGenerationSchema` has no
null type, so the model can never emit `null`. Marking the property optional
instead would make the model omit the key, and `z.nullable` (without
`.optional`) fails on a missing key — an untruthful contract. `.nullish()`
expresses the same intent and round-trips correctly.

### TypeScript changes (`package/src/tool-utils.ts`)

- Delete the hand-rolled `_def` walker (`getZodTypeString`, `zodSchemaToAnyMap`).
- `createTool` calls `z.toJSONSchema(definition.arguments, { io: 'input' })`,
  then validates the document against the subset above with a recursive
  whitelist walk. Violations throw `SchemaCreationError` with the JSON path.
- The handler wrapper (Zod parse of incoming args, result checks) is unchanged.

### Swift changes

- New `package/ios/ToolSchemaBuilder.swift`, importing only
  `FoundationModels`, with pure static functions:
  - `schema(fromJSONSchema: [String: Any]) throws -> DynamicGenerationSchema`
    — recursive builder; throws `AppleAIError.schemaCreationError` on anything
    outside the subset (defense in depth for hand-authored `ToolDefinition`s).
  - Legacy support: a flat `{ key: "string" | "number" | "boolean" }` map still
    works for hand-authored definitions, but unknown type names now throw
    instead of coercing to `String`.
  - `value(fromGeneratedContent:)` — recursive `GeneratedContent.Kind` →
    `Any?` (null → `nil`, arrays and structures preserved).
  - `generatedContent(fromValue:)` — recursive `Any?` →
    `GeneratedContent(kind:)`; throws on non-representable values instead of
    dropping fields.
- `HybridTool.swift` becomes a thin adapter: `AnyMap.toDictionary()` /
  `AnyMap.fromDictionary()` at the boundary, all logic in the builder. The
  JSON-string round-trip (which mangled bools via `JSONSerialization`) and the
  `unsafeBitCast` `KeyValuePairs` hack are deleted.

### Testing

- `package/tests/tool-utils.test.ts` (bun): the emitted `arguments` document
  for nested objects, arrays, optional fields, defaults, enums, literals,
  integer/number constraints, descriptions; rejection errors for each
  unsupported construct; handler round-trip of nested args and structured
  results.
- `package/tests/ToolSchemaBuilderTests.swift` (swiftc, host-side — macOS 26
  ships FoundationModels): `GenerationSchema` is `Codable`, so tests encode the
  built schema to JSON and assert its exact shape; value-codec tests assert
  `GeneratedContent.Kind` equality both directions, including null, nested
  structures, and arrays. Added to the `test:swift` script.

### Error handling

All rejections use the existing `SchemaCreationError` (TS) and
`AppleAIError.schemaCreationError` (Swift) types. Messages must state: the
property path, what was found, and what to use instead.

### Out of scope

String `pattern`/`format` guides, numeric `multipleOf`, unions beyond the
subset, and Android. The generator types in `src/types.ts` are unused by this
path and untouched.
