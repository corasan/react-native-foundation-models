## Project Overview

This is a React Native Nitro module that provides access to Apple's Foundation Models (Apple Intelligence) for iOS 26.0+. The project exposes Apple's on-device language model capabilities to React Native applications, enabling AI features with support for tool calling and streaming responses.

## Architecture

### Workspace Structure
- `package/` - The main Nitro module source code and native bindings
- `example/` - Demo Expo app showcasing the module's capabilities
- Root contains workspace configuration for both packages

## Common Development Commands

Check `package.json` scripts for available development commands.

## Development Notes

### Tool Integration
The module supports creating custom tools that the AI can invoke during conversations. Tools are defined using Zod schemas and can perform external API calls or other operations. See `example/app/index.tsx` for a weather tool implementation.

### Error Handling
The module includes comprehensive error handling for Apple AI availability states:
- Platform not supported (iOS < 26.0)
- Device not eligible for Apple Intelligence
- Apple Intelligence not enabled in Settings
- Model downloading or not ready

### Session Management
`LanguageModelSession` handles the lifecycle of AI conversations. Sessions can be configured with system instructions and tools. The React hooks provide higher-level abstractions with automatic error handling and state management.

### Native Dependencies
- Requires `react-native-nitro-modules` peer dependency. Must run nitrogen to generate native specs.
- iOS implementation uses Swift and integrates with Apple's Foundation Models framework
- Build process generates TypeScript definitions from Nitro specs

### Testing Device Requirements
- iOS 26.0+ physical device or simulator
- Apple Intelligence must be enabled in Settings > Apple Intelligence & Siri
- Compatible hardware (Apple Silicon Macs, newer iPhones/iPads)
