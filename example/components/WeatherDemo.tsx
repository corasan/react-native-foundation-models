import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native'
import { Text, View } from '@/components/Themed'

interface WeatherDemoProps {
  response: string
  isLoading: boolean
  error?: any
  onSubmit: (prompt: string) => Promise<void> | void
  onReset?: () => void
}

export function WeatherDemo({
  response,
  isLoading,
  error,
  onSubmit,
  onReset,
}: WeatherDemoProps) {
  const [prompt, setPrompt] = useState('')

  const respond = useCallback(async () => {
    const nextPrompt = prompt.trim()

    if (!nextPrompt) {
      Alert.alert('Error', 'Please enter a message')
      return
    }

    Keyboard.dismiss()

    try {
      await onSubmit(nextPrompt)
      setPrompt('')
    } catch (err) {
      console.error('Error during response:', err)
    }
  }, [prompt, onSubmit])

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      style={styles.container}
    >
      <View style={styles.container}>
        <Text style={styles.title}>{response}</Text>

        <View style={styles.loadingContainer}>
          {isLoading && <ActivityIndicator size="small" />}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            value={prompt}
            onChangeText={text => {
              setPrompt(text)
              if (error && onReset) onReset()
            }}
            onSubmitEditing={() => {
              void respond()
            }}
            returnKeyType="send"
            enablesReturnKeyAutomatically
            style={styles.input}
            placeholder="Ask about the weather..."
            editable={!isLoading}
          />
          <TouchableOpacity
            onPress={() => {
              void respond()
            }}
            disabled={isLoading || !prompt.trim()}
            style={[
              styles.button,
              (isLoading || !prompt.trim()) && styles.buttonDisabled,
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                (isLoading || !prompt.trim()) && styles.buttonTextDisabled,
              ]}
            >
              {isLoading ? '...' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 16,
  },
  title: {
    fontSize: 18,
    paddingVertical: 10,
  },
  loadingContainer: {
    height: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e3e3e3',
    borderRadius: 100,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: 'dodgerblue',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonTextDisabled: {
    color: '#888',
  },
})
