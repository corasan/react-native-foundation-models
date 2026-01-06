---
sidebar_position: 4
---

# Examples

## Basic Chat Application

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView } from 'react-native';
import { useLanguageModel } from 'react-native-apple-intelligence';

export default function ChatApp() {
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [input, setInput] = useState('');

  const { session, send, loading, isSessionReady, error } = useLanguageModel({
    instructions: "You are a helpful assistant.",
    onResponse: (response) => {
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  const sendMessage = async () => {
    if (!input.trim() || loading || !isSessionReady) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');

    try {
      await send(currentInput);
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove the user message if sending failed
      setMessages(prev => prev.slice(0, -1));
      setInput(currentInput); // Restore input
    }
  };

  if (!isSessionReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>
          {error ? `Error: ${error.message}` : 'Loading Apple Intelligence...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <ScrollView style={{ flex: 1, marginBottom: 10 }}>
        {messages.map((message, index) => (
          <View key={index} style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: 'bold' }}>{message.role}:</Text>
            <Text>{message.content}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row' }}>
        <TextInput
          style={{
            flex: 1,
            borderWidth: 1,
            padding: 10,
            marginRight: 10,
            borderRadius: 5
          }}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          editable={!loading}
        />
        <Button
          title={loading ? "Sending..." : "Send"}
          onPress={sendMessage}
          disabled={loading || !input.trim()}
        />
      </View>
    </View>
  );
}
```

## AI Assistant with Tools

```typescript
import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { z } from 'zod';
import { useLanguageModel, createTool } from 'react-native-apple-intelligence';

// Define a weather tool
const weatherTool = createTool({
  name: 'get_weather',
  description: 'Get current weather for a location',
  arguments: z.object({
    location: z.string().describe('The city and state/country'),
    unit: z.enum(['celsius', 'fahrenheit']).optional().default('celsius')
  }),
  handler: async ({ location, unit }) => {
    // In a real app, you'd call a weather API
    const temp = unit === 'celsius' ? '22°C' : '72°F';
    return {
      weather: `The weather in ${location} is sunny with a temperature of ${temp}.`,
      temperature: temp,
      condition: 'sunny'
    };
  }
});

// Define a calculator tool
const calculatorTool = createTool({
  name: 'calculate',
  description: 'Perform basic mathematical calculations',
  arguments: z.object({
    expression: z.string().describe('Mathematical expression to evaluate (e.g., "2 + 2")')
  }),
  handler: async ({ expression }) => {
    try {
      // Simple evaluation - in production, use a proper math parser
      const result = eval(expression);
      return {
        result: `The result of ${expression} is ${result}`,
        value: result
      };
    } catch (error) {
      return {
        result: `Error: Invalid mathematical expression`,
        error: true
      };
    }
  }
});

export default function AIAssistant() {
  const [response, setResponse] = useState('');

  const { send, loading, isSessionReady, error } = useLanguageModel({
    instructions: "You are a helpful assistant with access to weather information and a calculator. Use the tools when appropriate.",
    tools: [weatherTool, calculatorTool],
    onResponse: (response) => setResponse(response),
    onError: (error) => console.error('AI Error:', error)
  });

  const askQuestion = async (question: string) => {
    if (!isSessionReady) return;

    try {
      await send(question);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (!isSessionReady) {
    return (
      <View style={{ padding: 20 }}>
        <Text>{error ? `Error: ${error.message}` : 'Loading...'}</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        AI Assistant with Tools
      </Text>

      <Text style={{ marginBottom: 20, minHeight: 100 }}>
        {response || 'Ask me about the weather or give me a math problem!'}
      </Text>

      <Button
        title="What's the weather in San Francisco?"
        onPress={() => askQuestion("What's the weather in San Francisco?")}
        disabled={loading}
      />

      <View style={{ marginVertical: 10 }} />

      <Button
        title="Calculate 15 * 24"
        onPress={() => askQuestion("Calculate 15 * 24")}
        disabled={loading}
      />

      <View style={{ marginVertical: 10 }} />

      <Button
        title="What's 2 + 2 and what's the weather in Tokyo?"
        onPress={() => askQuestion("What's 2 + 2 and what's the weather in Tokyo?")}
        disabled={loading}
      />

      {loading && <Text style={{ marginTop: 10 }}>Processing...</Text>}
    </View>
  );
}
```

## Streaming Chat Interface

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { useLanguageModel, useStreamingResponse } from 'react-native-apple-intelligence';

export default function StreamingChat() {
  const [input, setInput] = useState('');

  const { session, isSessionReady, error: sessionError } = useLanguageModel({
    instructions: "You are a helpful assistant. Provide detailed responses."
  });

  const {
    response,
    isStreaming,
    error: streamError,
    streamResponse,
    reset
  } = useStreamingResponse(session!);

  const handleStreamingMessage = async () => {
    if (!session || !input.trim() || isStreaming) return;

    const currentInput = input;
    setInput('');
    reset();

    try {
      await streamResponse(currentInput, {
        onToken: (token) => {
          // Response is automatically updated via the hook
        },
        onComplete: (fullResponse) => {
          console.log('Streaming complete:', fullResponse);
        },
        onError: (error) => {
          console.error('Streaming error:', error);
        }
      });
    } catch (error) {
      console.error('Failed to start streaming:', error);
      setInput(currentInput); // Restore input on error
    }
  };

  if (!isSessionReady) {
    return (
      <View style={{ padding: 20, justifyContent: 'center', flex: 1 }}>
        <Text>
          {sessionError ? `Error: ${sessionError.message}` : 'Loading Apple Intelligence...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 20, flex: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        Streaming Chat
      </Text>

      <View style={{
        flex: 1,
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
        marginBottom: 20,
        backgroundColor: '#f5f5f5'
      }}>
        <Text>
          {response || 'AI response will appear here as it streams...'}
        </Text>
        {isStreaming && (
          <Text style={{ fontStyle: 'italic', color: '#666', marginTop: 10 }}>
            ● Streaming...
          </Text>
        )}
      </View>

      <TextInput
        style={{
          borderWidth: 1,
          padding: 10,
          marginBottom: 10,
          borderRadius: 5,
          minHeight: 80
        }}
        value={input}
        onChangeText={setInput}
        placeholder="Ask something that requires a detailed response..."
        multiline
        editable={!isStreaming}
      />

      <Button
        title={isStreaming ? "Streaming..." : "Send"}
        onPress={handleStreamingMessage}
        disabled={isStreaming || !input.trim()}
      />

      {(streamError || sessionError) && (
        <Text style={{ color: 'red', marginTop: 10 }}>
          Error: {streamError?.message || sessionError?.message}
        </Text>
      )}
    </View>
  );
}
```
