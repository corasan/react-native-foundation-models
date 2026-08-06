import Foundation

public enum AppleAIError: Error, LocalizedError, CustomStringConvertible {
    case sessionNotInitialized
    case sessionBusy
    case modelUnavailable(String)
    case toolCallError(Error)
    case toolExecutionError(String, Error)
    case schemaCreationError(String)
    case argumentParsingError(String)
    case responseParsingError(String)
    case unknownToolError(String)
    case sessionStreamingError(Error)
    case sessionResponseError(Error)
    case generationError(code: String, message: String)
    case contextExceeded
    case contextRecoveryFailed(Error)
    case unsupportedPlatform(String)
    case tokenCountError(Error)
    
    public var errorDescription: String? {
        switch self {
        case .sessionNotInitialized:
            return "Language model session is not initialized"
        case .sessionBusy:
            return "Another language model request is already in progress for this session"
        case .modelUnavailable(let reason):
            return "Foundation Models became unavailable: \(reason)"
        case .toolCallError(let error):
            return "Tool call failed: \(error.localizedDescription)"
        case .toolExecutionError(let toolName, let error):
            return "Tool '\(toolName)' execution failed: \(error.localizedDescription)"
        case .schemaCreationError(let details):
            return "Failed to create tool schema: \(details)"
        case .argumentParsingError(let details):
            return "Failed to parse tool arguments: \(details)"
        case .responseParsingError(let details):
            return "Failed to parse tool response: \(details)"
        case .unknownToolError(let toolName):
            return "Unknown tool: \(toolName)"
        case .sessionStreamingError(let error):
            return "Session streaming failed: \(error.localizedDescription)"
        case .sessionResponseError(let error):
            return "Session response failed: \(error.localizedDescription)"
        case .generationError(_, let message):
            return message
        case .contextExceeded:
            return "Context window size exceeded, session recreated with conversation summary"
        case .contextRecoveryFailed(let error):
            return "Context window size exceeded and session recovery failed: \(error.localizedDescription)"
        case .unsupportedPlatform(let message):
            return message
        case .tokenCountError(let error):
            return "Token count failed: \(error.localizedDescription)"
        }
    }
    
    public var description: String {
        return "[\(code)] \(errorDescription ?? "Unknown AppleAI error")"
    }
    
    public var code: String {
        switch self {
        case .sessionNotInitialized:
            return "SESSION_NOT_INITIALIZED"
        case .sessionBusy:
            return "SESSION_BUSY"
        case .modelUnavailable:
            return "MODEL_UNAVAILABLE"
        case .toolCallError:
            return "TOOL_CALL_ERROR"
        case .toolExecutionError:
            return "TOOL_EXECUTION_ERROR"
        case .schemaCreationError:
            return "SCHEMA_CREATION_ERROR"
        case .argumentParsingError:
            return "ARGUMENT_PARSING_ERROR"
        case .responseParsingError:
            return "RESPONSE_PARSING_ERROR"
        case .unknownToolError:
            return "UNKNOWN_TOOL_ERROR"
        case .sessionStreamingError:
            return "SESSION_STREAMING_ERROR"
        case .sessionResponseError:
            return "SESSION_RESPONSE_ERROR"
        case .generationError(let code, _):
            return code
        case .contextExceeded:
            return "CONTEXT_EXCEEDED"
        case .contextRecoveryFailed:
            return "CONTEXT_RECOVERY_FAILED"
        case .unsupportedPlatform:
            return "UNSUPPORTED_PLATFORM"
        case .tokenCountError:
            return "TOKEN_COUNT_ERROR"
        }
    }
}

public struct ErrorInfo {
    let code: String
    let message: String
    let details: [String: Any]?
    
    init(error: AppleAIError, details: [String: Any]? = nil) {
        self.code = error.code
        self.message = error.errorDescription ?? "Unknown AppleAI error"
        self.details = details
    }
}
