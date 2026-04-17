import NitroModules
import FoundationModels

@available(iOS 26.0, *)
class HybridLanguageModelSession: HybridLanguageModelSessionSpec {
    private var session: LanguageModelSession? = nil
    private var isResponding: Bool = false
    private var tools: [any Tool] = []
    private var jsTools: [ToolDefinition] = []
    private var contextWasReset: Bool = false
    private let model: SystemLanguageModel
    
    /**
     * Initializes the wrapper with a FoundationModels session configured
     * according to the provided configuration.
     *
     * - Parameter config: Custom configuration containing instructions and HybridTool instances
     * - Throws: Any errors that occur during session creation
     */
    init(config: LanguageModelSessionConfig, model: SystemLanguageModel) throws {
        let jsTools: [ToolDefinition] = config.tools ?? []
        var tools: [any Tool] = []
        
        if (!jsTools.isEmpty) {
            do {
                tools = try jsTools.map { tool in
                    return try HybridTool(
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.arguments,
                        handler: { args in tool.handler(args) }
                    )
                }
            } catch {
                throw AppleAIError.toolCallError(error)
            }
        }
        
        let enhancedInstructions = Self.buildEnhancedInstructions(
            baseInstructions: config.instructions, 
            tools: jsTools
        )
        
        let session = LanguageModelSession(
            model: model,
            tools: tools,
            instructions: enhancedInstructions
        )
        self.model = model
        self.session = session
        self.tools = tools
        self.jsTools = jsTools
    }
    
    /**
     * Generates a non-streaming response and resolves with the final content.
     */
    @available(iOS 26.0, *)
    func respond(prompt: String) throws -> Promise<String> {
        return Promise.async {
            guard let modelSession = self.session else {
                throw AppleAIError.sessionNotInitialized
            }

            guard !prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                return ""
            }

            self.isResponding = true

            do {
                let result = try await modelSession.respond(to: prompt)
                self.isResponding = false
                return result.content
            } catch LanguageModelSession.GenerationError.exceededContextWindowSize {
                self.isResponding = false
                let newSession = try await self.createNewSessionWithSummary(previousSession: modelSession)
                self.session = newSession
                self.contextWasReset = true
                throw AppleAIError.contextExceeded
            } catch let error as AppleAIError {
                self.isResponding = false
                throw error
            } catch {
                self.isResponding = false
                throw AppleAIError.sessionStreamingError(error)
            }
        }
    }

    /**
     * Implements the streaming response functionality required by the Nitro interface.
     * This method bridges the FoundationModels streaming API with the Nitro callback system.
     */
    @available(iOS 26.0, *)
    func streamResponse(prompt: String, onStream: @escaping (String) -> Void) throws -> Promise<String> {
        return Promise.async {
            guard let modelSession = self.session else {
                throw AppleAIError.sessionNotInitialized
            }
            
            guard !prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                return ""
            }
            
            self.isResponding = true
            
            do {
                let stream = modelSession.streamResponse(to: prompt)

                for try await token in stream {
                    onStream(token.content)
                }
                
                let result = try await stream.collect()
                self.isResponding = false
                return result.content
            } catch LanguageModelSession.GenerationError.exceededContextWindowSize {
                self.isResponding = false
                let newSession = try await self.createNewSessionWithSummary(previousSession: modelSession)
                self.session = newSession
                self.contextWasReset = true
                throw AppleAIError.contextExceeded
            } catch let error as AppleAIError {
                self.isResponding = false
                throw error
            } catch {
                self.isResponding = false
                throw AppleAIError.sessionStreamingError(error)
            }
        }
    }
    
    @available(iOS 26.0, *)
    var wasContextReset: Bool {
        return contextWasReset
    }
    
    @available(iOS 26.0, *)
    private func createNewSessionWithSummary(previousSession: LanguageModelSession) async throws -> LanguageModelSession {
        let summarySession = LanguageModelSession(model: self.model, transcript: previousSession.transcript)
        let summaryResponse = try await summarySession.respond(to: "Summarize this conversation in a concise way that preserves the key context and information.")
        let enhancedInstructions = Self.buildEnhancedInstructions(
            baseInstructions: "You are a helpful assistant. Previous conversation summary: \(summaryResponse.content)",
            tools: self.jsTools
        )
        
        return LanguageModelSession(
            model: self.model,
            tools: self.tools,
            instructions: enhancedInstructions
        )
    }
    
    @available(iOS 26.0, *)
    private static func buildEnhancedInstructions(baseInstructions: String?, tools: [ToolDefinition]) -> String {
        let base = baseInstructions ?? "You are a helpful assistant"
        
        guard !tools.isEmpty else {
            return base
        }
        
        let toolDescriptions = tools.map { tool in
            "- \(tool.name): \(tool.description)"
        }.joined(separator: "\n")
        
        return "\(base). You have access to these tools:\n\(toolDescriptions)"
    }
}

/**
 * Custom configuration that uses HybridTool instead of HybridToolSpec
 */
@available(iOS 26.0, *)
struct CustomLanguageModelSessionConfig {
    let instructions: String?
    let tools: [HybridTool]?
    
    init(instructions: String? = nil, tools: [HybridTool]? = nil) {
        self.instructions = instructions
        self.tools = tools
    }
}
