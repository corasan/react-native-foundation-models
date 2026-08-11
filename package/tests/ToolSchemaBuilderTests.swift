import Foundation
import FoundationModels

@available(iOS 26.0, macOS 26.0, *)
private func encodedSchema(_ document: [String: Any]) throws -> [String: Any] {
    let schema = try ToolSchemaBuilder.schema(fromArguments: document)
    let data = try JSONEncoder().encode(schema)
    guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
        preconditionFailure("GenerationSchema did not encode to a JSON object")
    }
    return json
}

/// Resolves `$ref` pointers into `$defs` so assertions can follow named sub-schemas.
private func resolve(_ node: [String: Any], in root: [String: Any]) -> [String: Any] {
    guard let ref = node["$ref"] as? String,
          let name = ref.components(separatedBy: "/").last,
          let defs = root["$defs"] as? [String: Any],
          let target = defs[name] as? [String: Any]
    else {
        return node
    }
    return target
}

private func property(_ name: String, of root: [String: Any]) -> [String: Any] {
    guard let properties = root["properties"] as? [String: Any],
          let node = properties[name] as? [String: Any]
    else {
        preconditionFailure("Missing property '\(name)' in encoded schema: \(root)")
    }
    return resolve(node, in: root)
}

/// Apple encodes string enums as `anyOf` of single-value enums; flatten them back.
private func enumValues(_ node: [String: Any]) -> [String] {
    if let values = node["enum"] as? [String] {
        return values
    }
    guard let branches = node["anyOf"] as? [[String: Any]] else {
        return []
    }
    return branches.flatMap { $0["enum"] as? [String] ?? [] }
}

private func expectSchemaCreationFailure(
    _ document: [String: Any], _ label: String
) {
    guard #available(iOS 26.0, macOS 26.0, *) else { return }
    do {
        _ = try ToolSchemaBuilder.schema(fromArguments: document)
        preconditionFailure("Expected schema creation to fail: \(label)")
    } catch let error as AppleAIError {
        precondition(error.code == "SCHEMA_CREATION_ERROR", "Wrong error for \(label): \(error)")
    } catch {
        preconditionFailure("Wrong error type for \(label): \(error)")
    }
}

@available(iOS 26.0, macOS 26.0, *)
private func canonicalJSON(_ value: [String: Any?]) throws -> String {
    let bridged = value.mapValues { $0 ?? NSNull() }
    let data = try JSONSerialization.data(withJSONObject: bridged, options: [.sortedKeys])
    return String(data: data, encoding: .utf8)!
}

@main
struct ToolSchemaBuilderTests {
    static func main() throws {
        guard #available(iOS 26.0, macOS 26.0, *) else {
            print("ToolSchemaBuilder tests skipped: FoundationModels unavailable")
            return
        }
        try schemaContractTests()
        try legacyFormatTests()
        rejectionTests()
        try valueDecodingTests()
        try valueEncodingTests()
        print("Swift tool schema builder tests passed")
    }

    @available(iOS 26.0, macOS 26.0, *)
    static func schemaContractTests() throws {
        let document: [String: Any] = [
            "type": "object",
            "properties": [
                "city": ["type": "string", "description": "City name"],
                "days": ["type": "integer", "minimum": 1, "maximum": 10],
                "ratio": ["type": "number", "minimum": 0.5],
                "celsius": ["type": "boolean"],
                "units": ["type": "string", "enum": ["c", "f"]],
                "mode": ["type": "string", "const": "forecast"],
                "tags": [
                    "type": "array",
                    "items": ["type": "string"],
                    "minItems": 1,
                    "maxItems": 5,
                ],
                "location": [
                    "type": "object",
                    "properties": [
                        "lat": ["type": "number"],
                        "lon": ["type": "number"],
                        "label": ["type": "string"],
                    ],
                    "required": ["lat", "lon"],
                ],
            ],
            "required": ["city", "days", "ratio", "celsius", "units", "mode", "tags", "location"],
        ]

        let encoded = try encodedSchema(document)

        let required = Set(encoded["required"] as? [String] ?? [])
        precondition(
            required == ["city", "days", "ratio", "celsius", "units", "mode", "tags", "location"],
            "Top-level required mismatch: \(required)"
        )

        let city = property("city", of: encoded)
        precondition(city["type"] as? String == "string")
        precondition(city["description"] as? String == "City name", "Description lost: \(city)")

        let days = property("days", of: encoded)
        precondition(days["type"] as? String == "integer")
        precondition(days["minimum"] as? Int == 1 && days["maximum"] as? Int == 10,
                     "Integer bounds lost: \(days)")

        let ratio = property("ratio", of: encoded)
        precondition(ratio["type"] as? String == "number")
        precondition(ratio["minimum"] as? Double == 0.5, "Number minimum lost: \(ratio)")

        precondition(property("celsius", of: encoded)["type"] as? String == "boolean")

        precondition(Set(enumValues(property("units", of: encoded))) == ["c", "f"],
                     "Enum cases lost")
        precondition(enumValues(property("mode", of: encoded)) == ["forecast"],
                     "String literal lost")

        let tags = property("tags", of: encoded)
        precondition(tags["type"] as? String == "array")
        precondition((tags["items"] as? [String: Any])?["type"] as? String == "string")
        precondition(tags["minItems"] as? Int == 1 && tags["maxItems"] as? Int == 5,
                     "Array bounds lost: \(tags)")

        let location = property("location", of: encoded)
        precondition(location["type"] as? String == "object")
        precondition(Set(location["required"] as? [String] ?? []) == ["lat", "lon"],
                     "Nested optionality lost: \(location)")
        let lat = property("lat", of: location)
        precondition(lat["type"] as? String == "number")

        // Optional top-level property stays out of `required`.
        let optionalDoc: [String: Any] = [
            "type": "object",
            "properties": [
                "required": ["type": "string"],
                "optional": ["type": "string"],
            ],
            "required": ["required"],
        ]
        let optionalEncoded = try encodedSchema(optionalDoc)
        precondition(optionalEncoded["required"] as? [String] == ["required"],
                     "Optional field became required")
    }

    @available(iOS 26.0, macOS 26.0, *)
    static func legacyFormatTests() throws {
        let encoded = try encodedSchema([
            "city": "string",
            "count": "number",
            "flag": "boolean",
        ])
        precondition(property("city", of: encoded)["type"] as? String == "string")
        precondition(property("count", of: encoded)["type"] as? String == "number")
        precondition(property("flag", of: encoded)["type"] as? String == "boolean")
        precondition(Set(encoded["required"] as? [String] ?? []) == ["city", "count", "flag"])
    }

    static func rejectionTests() {
        expectSchemaCreationFailure(["city": "uuid"], "unknown legacy type name")
        expectSchemaCreationFailure(
            [
                "type": "object",
                "properties": ["x": ["anyOf": [["type": "string"], ["type": "number"]]]],
            ],
            "union property"
        )
        expectSchemaCreationFailure(
            [
                "type": "object",
                "properties": ["x": ["type": "string", "pattern": "^a+$"]],
            ],
            "regex pattern"
        )
        expectSchemaCreationFailure(
            [
                "type": "object",
                "properties": ["x": ["type": "array"]],
            ],
            "array without items"
        )
        expectSchemaCreationFailure(
            [
                "type": "object",
                "properties": ["x": ["type": "null"]],
            ],
            "null type"
        )
        expectSchemaCreationFailure(
            [
                "type": "object",
                "properties": ["x": ["type": "integer", "enum": [1, 2, 3]]],
            ],
            "numeric enum"
        )
        expectSchemaCreationFailure(
            [
                "type": "object",
                "properties": ["x": ["type": "number", "const": 3]],
            ],
            "numeric literal"
        )
    }

    @available(iOS 26.0, macOS 26.0, *)
    static func valueDecodingTests() throws {
        let content = GeneratedContent(kind: .structure(
            properties: [
                "city": GeneratedContent(kind: .string("NYC")),
                "temperature": GeneratedContent(kind: .number(21.5)),
                "sunny": GeneratedContent(kind: .bool(true)),
                "alerts": GeneratedContent(kind: .null),
                "tags": GeneratedContent(kind: .array([
                    GeneratedContent(kind: .string("a")),
                    GeneratedContent(kind: .string("b")),
                ])),
                "location": GeneratedContent(kind: .structure(
                    properties: [
                        "lat": GeneratedContent(kind: .number(40.7)),
                        "note": GeneratedContent(kind: .null),
                    ],
                    orderedKeys: ["lat", "note"]
                )),
            ],
            orderedKeys: ["city", "temperature", "sunny", "alerts", "tags", "location"]
        ))

        let decoded = try ToolSchemaBuilder.value(from: content)

        precondition(decoded["city"] as? String == "NYC")
        precondition(decoded["temperature"] as? Double == 21.5)
        precondition(decoded["sunny"] as? Bool == true)
        precondition(decoded.keys.contains("alerts") && decoded["alerts"]! == nil,
                     "null must decode to nil, not be dropped or stringified")
        precondition(decoded["tags"] as? [String] == ["a", "b"],
                     "nested array lost: \(String(describing: decoded["tags"]))")
        guard let location = decoded["location"] as? [String: Any?] else {
            preconditionFailure("nested object was stringified or dropped")
        }
        precondition(location["lat"] as? Double == 40.7)
        precondition(location.keys.contains("note") && location["note"]! == nil)

        // Non-structure top-level content is an argument contract violation.
        do {
            _ = try ToolSchemaBuilder.value(from: GeneratedContent(kind: .string("oops")))
            preconditionFailure("Expected non-structure content to be rejected")
        } catch let error as AppleAIError {
            precondition(error.code == "ARGUMENT_PARSING_ERROR", "Wrong error: \(error)")
        }
    }

    @available(iOS 26.0, macOS 26.0, *)
    static func valueEncodingTests() throws {
        let result: [String: Any?] = [
            "summary": "cloudy",
            "count": 3,
            "temp": 21.5,
            "active": true,
            "alerts": nil,
            "hours": [1.0, 2.0] as [Any?],
            "station": ["id": "KNYC", "elevation": 10.0] as [String: Any?],
        ]

        let content = try ToolSchemaBuilder.generatedContent(fromResult: result)

        guard case .structure(let properties, let orderedKeys) = content.kind else {
            preconditionFailure("Result did not encode to a structure")
        }
        precondition(Set(orderedKeys) == Set(result.keys),
                     "Result fields were silently omitted: \(orderedKeys)")
        precondition(properties["summary"]?.kind == .string("cloudy"))
        precondition(properties["count"]?.kind == .number(3))
        precondition(properties["temp"]?.kind == .number(21.5))
        precondition(properties["active"]?.kind == .bool(true))
        precondition(properties["alerts"]?.kind == .null, "null field was omitted")
        precondition(properties["hours"]?.kind == .array([
            GeneratedContent(kind: .number(1.0)),
            GeneratedContent(kind: .number(2.0)),
        ]))
        guard case .structure(let station, _)? = properties["station"]?.kind else {
            preconditionFailure("Nested result object was omitted or stringified")
        }
        precondition(station["id"]?.kind == .string("KNYC"))
        precondition(station["elevation"]?.kind == .number(10.0))

        // Round-trip: decode(encode(x)) == x.
        let roundTripped = try ToolSchemaBuilder.value(
            from: try ToolSchemaBuilder.generatedContent(fromResult: result)
        )
        let roundTrippedJSON = try canonicalJSON(roundTripped)
        let originalJSON = try canonicalJSON(result)
        precondition(roundTrippedJSON == originalJSON, "Round-trip mismatch")

        // Unrepresentable values must throw, never be dropped.
        do {
            _ = try ToolSchemaBuilder.generatedContent(fromResult: ["when": Date()])
            preconditionFailure("Expected unrepresentable result value to be rejected")
        } catch let error as AppleAIError {
            precondition(error.code == "RESPONSE_PARSING_ERROR", "Wrong error: \(error)")
        }
    }
}
