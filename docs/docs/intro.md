---
sidebar_position: 1
---

# Getting Started

React Native Apple AI is a Nitro module that provides access to Apple's Foundation Models (Apple Intelligence) for iOS 26.0+. This module enables AI features directly on-device with support for tool calling and streaming responses.

## Prerequisites

- iOS 26.0+ physical device or simulator
- Apple Intelligence enabled in Settings > Apple Intelligence & Siri
- Compatible hardware (Apple Silicon Macs, newer iPhones/iPads)
- React Native development environment
- Xcode for iOS development

## Installation

```bash
npm install react-native-apple-intelligence
# or
yarn add react-native-apple-intelligence
# or
bun add react-native-apple-intelligence
```

### iOS Setup

No additional setup is required for iOS. The module will automatically detect Apple Intelligence availability.

## Quick Start

```typescript
import { useLanguageModel } from 'react-native-apple-intelligence';

function MyComponent() {
  const { session, send, loading, isSessionReady, error } = useLanguageModel({
    instructions: "You are a helpful assistant."
  });

  const handleSendMessage = async () => {
    try {
      const response = await send("Hello!");
      console.log(response);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (!isSessionReady) {
    return <Text>Apple Intelligence is not available</Text>;
  }

  return (
    <View>
      <Button
        title={loading ? "Sending..." : "Send Message"}
        onPress={handleSendMessage}
        disabled={loading}
      />
    </View>
  );
}
```

## What's Next?

- [Learn about the Core Concepts](./core-concepts)
- [See API Reference](./api-reference)
- [Check out Examples](./examples)
