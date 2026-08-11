import Foundation
import FoundationModels

/// Converts the JSON Schema documents emitted by `createTool` into
/// `GenerationSchema`, and converts tool argument/result values between
/// `GeneratedContent` and plain Swift collections. Pure FoundationModels —
/// no NitroModules dependency — so it is testable on the host.
@available(iOS 26.0, macOS 26.0, *)
enum ToolSchemaBuilder {
    /// Keywords the TypeScript side already rejects; rejected here too so
    /// hand-authored `ToolDefinition`s cannot silently degrade. Kept in sync
    /// with tests/fixtures/unsupported-schema-keywords.json (drift-guarded by
    /// tests on both sides).
    static let unsupportedKeywords: Set<String> = [
        "anyOf", "oneOf", "allOf", "not", "pattern", "format", "prefixItems",
        "propertyNames", "multipleOf", "exclusiveMinimum", "exclusiveMaximum",
        "$ref", "$defs",
    ]

    // MARK: - Schema conversion

    static func schema(fromArguments document: [String: Any]) throws -> GenerationSchema {
        let root: DynamicGenerationSchema
        if document["type"] as? String == "object" {
            root = try dynamicSchema(from: document, name: "ToolParameters", path: "arguments")
        } else {
            root = try legacySchema(from: document)
        }
        return try GenerationSchema(root: root, dependencies: [])
    }

    /// Dictionaries that crossed the Nitro bridge arrive as `[String: Any?]`;
    /// normalize both spellings into `[String: Any]`.
    private static func objectNode(_ value: Any?) -> [String: Any]? {
        if let dictionary = value as? [String: Any] {
            return dictionary
        }
        if let dictionary = value as? [String: Any?] {
            return dictionary.mapValues { $0 ?? NSNull() }
        }
        return nil
    }

    private static func stringArray(_ value: Any?) -> [String]? {
        if let strings = value as? [String] {
            return strings
        }
        if let elements = value as? [Any?] {
            let strings = elements.compactMap { $0 as? String }
            return strings.count == elements.count ? strings : nil
        }
        return nil
    }

    private static func dynamicSchema(
        from node: [String: Any], name: String, path: String
    ) throws -> DynamicGenerationSchema {
        for keyword in node.keys {
            if unsupportedKeywords.contains(keyword) {
                throw AppleAIError.schemaCreationError(
                    "Property '\(path)' uses unsupported schema keyword '\(keyword)'"
                )
            }
        }
        if let additional = node["additionalProperties"], (additional as? Bool) != false {
            throw AppleAIError.schemaCreationError(
                "Property '\(path)' uses dynamic keys, which are not supported"
            )
        }

        let description = node["description"] as? String
        let type = node["type"] as? String

        if type != "string", node["enum"] != nil || node["const"] != nil {
            throw AppleAIError.schemaCreationError(
                "Property '\(path)' uses a non-string enum or literal, which is not supported"
            )
        }

        switch type {
        case "object":
            let properties = objectNode(node["properties"]) ?? [:]
            let required = Set(stringArray(node["required"]) ?? [])
            let schemaProperties = try properties.keys.sorted().map { key -> DynamicGenerationSchema.Property in
                guard let childNode = objectNode(properties[key]) else {
                    throw AppleAIError.schemaCreationError(
                        "Property '\(path).\(key)' is not a schema object"
                    )
                }
                return DynamicGenerationSchema.Property(
                    name: key,
                    description: childNode["description"] as? String,
                    schema: try dynamicSchema(from: childNode, name: "\(path).\(key)", path: "\(path).\(key)"),
                    isOptional: !required.contains(key)
                )
            }
            return DynamicGenerationSchema(
                name: name, description: description, properties: schemaProperties
            )

        case "array":
            guard let items = objectNode(node["items"]) else {
                throw AppleAIError.schemaCreationError(
                    "Property '\(path)' is an array without a single element schema"
                )
            }
            var itemSchema = try dynamicSchema(from: items, name: "\(path)[]", path: "\(path)[]")
            // Primitive schemas have no description slot; a one-choice anyOf
            // wrapper carries the element description into the model contract.
            if let itemDescription = items["description"] as? String, isPlainPrimitive(items) {
                itemSchema = DynamicGenerationSchema(
                    name: "\(path)[]", description: itemDescription, anyOf: [itemSchema]
                )
            }
            return DynamicGenerationSchema(
                arrayOf: itemSchema,
                minimumElements: intBound(node["minItems"]),
                maximumElements: intBound(node["maxItems"])
            )

        case "string":
            if let values = node["enum"] {
                guard let choices = stringArray(values), !choices.isEmpty else {
                    throw AppleAIError.schemaCreationError(
                        "Property '\(path)' uses a non-string enum, which is not supported"
                    )
                }
                return DynamicGenerationSchema(name: name, description: description, anyOf: choices)
            }
            if let literal = node["const"] {
                guard let choice = literal as? String else {
                    throw AppleAIError.schemaCreationError(
                        "Property '\(path)' uses a non-string literal, which is not supported"
                    )
                }
                return DynamicGenerationSchema(name: name, description: description, anyOf: [choice])
            }
            return DynamicGenerationSchema(type: String.self)

        case "integer":
            return DynamicGenerationSchema(type: Int.self, guides: rangeGuides(
                minimum: intBound(node["minimum"]), maximum: intBound(node["maximum"]),
                min: { .minimum($0) }, max: { .maximum($0) }, range: { .range($0) }
            ))

        case "number":
            return DynamicGenerationSchema(type: Double.self, guides: rangeGuides(
                minimum: doubleBound(node["minimum"]), maximum: doubleBound(node["maximum"]),
                min: { .minimum($0) }, max: { .maximum($0) }, range: { .range($0) }
            ))

        case "boolean":
            return DynamicGenerationSchema(type: Bool.self)

        case let type:
            throw AppleAIError.schemaCreationError(
                "Property '\(path)' has unsupported type '\(type ?? "unknown")'"
            )
        }
    }

    /// Backward compatibility for hand-authored `ToolDefinition`s that use the
    /// flat `{ key: "typename" }` format. Unknown type names now fail instead
    /// of silently becoming strings.
    private static func legacySchema(from document: [String: Any]) throws -> DynamicGenerationSchema {
        let properties = try document.keys.sorted().map { key -> DynamicGenerationSchema.Property in
            guard let typeName = document[key] as? String else {
                throw AppleAIError.schemaCreationError(
                    "Property '\(key)' must be a type name string or a JSON Schema object"
                )
            }
            let schema: DynamicGenerationSchema
            switch typeName.lowercased() {
            case "string":
                schema = DynamicGenerationSchema(type: String.self)
            case "number", "double", "float":
                schema = DynamicGenerationSchema(type: Double.self)
            case "int", "integer":
                schema = DynamicGenerationSchema(type: Int.self)
            case "boolean", "bool":
                schema = DynamicGenerationSchema(type: Bool.self)
            default:
                throw AppleAIError.schemaCreationError(
                    "Property '\(key)' has unsupported type '\(typeName)'. Supported: string, number, boolean, integer, or a JSON Schema object"
                )
            }
            return DynamicGenerationSchema.Property(name: key, schema: schema)
        }
        return DynamicGenerationSchema(name: "ToolParameters", properties: properties)
    }

    /// True for schema nodes that map to `DynamicGenerationSchema(type:)`,
    /// which has no description parameter of its own.
    private static func isPlainPrimitive(_ node: [String: Any]) -> Bool {
        switch node["type"] as? String {
        case "number", "integer", "boolean":
            return true
        case "string":
            return node["enum"] == nil && node["const"] == nil
        default:
            return false
        }
    }

    private static func rangeGuides<T>(
        minimum: T?, maximum: T?,
        min: (T) -> GenerationGuide<T>,
        max: (T) -> GenerationGuide<T>,
        range: (ClosedRange<T>) -> GenerationGuide<T>
    ) -> [GenerationGuide<T>] {
        switch (minimum, maximum) {
        case (let lower?, let upper?): return [range(lower...upper)]
        case (let lower?, nil): return [min(lower)]
        case (nil, let upper?): return [max(upper)]
        case (nil, nil): return []
        }
    }

    private static func intBound(_ value: Any?) -> Int? {
        switch value {
        case let intValue as Int: return intValue
        case let int64Value as Int64: return Int(exactly: int64Value)
        case let doubleValue as Double: return Int(exactly: doubleValue)
        default: return nil
        }
    }

    private static func doubleBound(_ value: Any?) -> Double? {
        switch value {
        case let doubleValue as Double: return doubleValue
        case let intValue as Int: return Double(intValue)
        case let int64Value as Int64: return Double(int64Value)
        default: return nil
        }
    }

    // MARK: - Value conversion

    /// Decodes model-generated tool arguments into plain Swift values,
    /// preserving nested structures, arrays, and nulls.
    static func value(from content: GeneratedContent) throws -> [String: Any?] {
        guard case .structure(let properties, let orderedKeys) = content.kind else {
            throw AppleAIError.argumentParsingError(
                "Expected tool arguments to be an object, got \(content.kind)"
            )
        }
        return structureValues(properties, orderedKeys: orderedKeys)
    }

    private static func structureValues(
        _ properties: [String: GeneratedContent], orderedKeys: [String]
    ) -> [String: Any?] {
        var object: [String: Any?] = [:]
        for key in orderedKeys {
            guard let property = properties[key] else { continue }
            object[key] = anyValue(from: property)
        }
        return object
    }

    private static func anyValue(from content: GeneratedContent) -> Any? {
        switch content.kind {
        case .null:
            return nil
        case .bool(let boolValue):
            return boolValue
        case .number(let doubleValue):
            return doubleValue
        case .string(let stringValue):
            return stringValue
        case .array(let elements):
            return elements.map { anyValue(from: $0) }
        case .structure(let properties, let orderedKeys):
            return structureValues(properties, orderedKeys: orderedKeys)
        @unknown default:
            return nil
        }
    }

    /// Encodes a structured tool result. Every field is preserved;
    /// unrepresentable values fail loudly instead of being dropped.
    static func generatedContent(fromResult result: [String: Any?]) throws -> GeneratedContent {
        return GeneratedContent(kind: try kind(fromValue: result, path: ""))
    }

    private static func kind(fromValue value: Any?, path: String) throws -> GeneratedContent.Kind {
        switch value {
        case nil, is NSNull:
            return .null
        case let boolValue as Bool:
            return .bool(boolValue)
        case let intValue as Int:
            return .number(Double(intValue))
        case let int64Value as Int64:
            return .number(Double(int64Value))
        case let doubleValue as Double:
            return .number(doubleValue)
        case let floatValue as Float:
            return .number(Double(floatValue))
        case let stringValue as String:
            return .string(stringValue)
        case let dictionary as [String: Any?]:
            let orderedKeys = Array(dictionary.keys)
            var properties: [String: GeneratedContent] = [:]
            for key in orderedKeys {
                let childPath = path.isEmpty ? key : "\(path).\(key)"
                properties[key] = try GeneratedContent(
                    kind: kind(fromValue: dictionary[key] ?? nil, path: childPath)
                )
            }
            return .structure(properties: properties, orderedKeys: orderedKeys)
        case let array as [Any?]:
            let elements = try array.enumerated().map { index, element in
                try GeneratedContent(kind: kind(fromValue: element, path: "\(path)[\(index)]"))
            }
            return .array(elements)
        default:
            throw AppleAIError.responseParsingError(
                "Tool result field '\(path)' has unsupported value of type \(type(of: value ?? "nil"))"
            )
        }
    }
}
