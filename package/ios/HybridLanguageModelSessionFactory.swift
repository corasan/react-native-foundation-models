import NitroModules
import FoundationModels

/**
 * Factory class that creates LanguageModelSession instances.
 * This class implements the Nitro module specification and serves as the
 * bridge between React Native and Apple's FoundationModels framework.
 */
class HybridLanguageModelSessionFactory: HybridLanguageModelSessionFactorySpec {
    /**
     * Creates a new FMLanguageModelSession instance configured with the provided settings.
     *
     * - Parameter config: Configuration containing instructions and tools for the session
     * - Returns: A configured FMLanguageModelSession instance
     * - Throws: Any errors that occur during session creation
     */
    func create(config: LanguageModelSessionConfig) throws -> HybridLanguageModelSessionSpec {
        if #available(iOS 26.0, *) {
            return try HybridLanguageModelSession(config: config)
        } else {
            throw NSError(domain: "RNFoundationModels.FoundationModels", code: 1001, userInfo: [
                NSLocalizedDescriptionKey: "Apple Foundation Models requires iOS 26.0 or later"
            ])
        }
    }

    var isAvailable: Bool {
        if #available(iOS 26.0, *) {
            let model = SystemLanguageModel.default
            return model.isAvailable
        } else {
            return false
        }
    }

    var availabilityStatus: String {
        if #available(iOS 26.0, *) {
            let model = SystemLanguageModel.default
            switch model.availability {
            case .available:
                return "available"
            case .unavailable(.deviceNotEligible):
                return "unavailable.deviceNotEligible"
            case .unavailable(.appleIntelligenceNotEnabled):
                return "unavailable.appleIntelligenceNotEnabled"
            case .unavailable(.modelNotReady):
                return "unavailable.modelNotReady"
            case .unavailable(let other):
                return "unavailable.unknown(\(other))"
            }
        } else {
            return "unavailable.deviceNotEligible"
        }
    }
}
