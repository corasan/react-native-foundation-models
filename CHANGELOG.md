# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0]

### Added

- Initial release of `react-native-foundation-models`.
- `LanguageModelSession` for interacting with Apple's on-device Foundation Models.
- `useLanguageModel` and `useStreamingResponse` React hooks.
- Tool calling support via Zod schemas (`createTool`).
- `checkFoundationModelsAvailability`, `getFoundationModelsContextSize`, and
  `getFoundationModelsModelFamily` helpers.
- `SystemLanguageModel` configuration (`useCase`, `guardrails`).
- Native `tokenCount` method on `LanguageModelSession`.
