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
import { formatNumber } from '@/utils/formatNumber'
import type { TokenMetrics } from '@/utils/tokenMetrics'

interface UsageMetrics {
  contextSize?: number
  tokens?: TokenMetrics
  contextReset?: boolean
}

interface WeatherDemoProps {
  response: string
  isLoading: boolean
  error?: any
  onSubmit: (prompt: string) => Promise<void> | void
  onReset?: () => void
  metrics?: UsageMetrics
}

export function WeatherDemo({
  response,
  isLoading,
  error,
  onSubmit,
  onReset,
  metrics,
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
        <View style={styles.responseCard}>
          <Text style={styles.responseLabel}>Latest response</Text>
          <Text style={styles.title}>
            {response || 'Ask about the weather to start a session.'}
          </Text>
        </View>

        <View style={styles.metricsCard}>
          <Text style={styles.metricsTitle}>Session usage</Text>
          <Text style={styles.metricsNote}>
            Token counts are estimated on this SDK build.
          </Text>
          <Text style={styles.metricText}>
            Context window: {formatNumber(metrics?.contextSize)} tokens
          </Text>
          <Text style={styles.metricText}>
            Estimated prompt tokens: {formatNumber(metrics?.tokens?.promptTokens)}
          </Text>
          <Text style={styles.metricText}>
            Estimated response tokens: {formatNumber(metrics?.tokens?.responseTokens)}
          </Text>
          <Text style={styles.metricText}>
            Estimated total tokens: {formatNumber(metrics?.tokens?.totalTokens)}
          </Text>
          {metrics?.contextReset ? (
            <Text style={styles.resetText}>
              Context was summarized and reset after reaching the limit.
            </Text>
          ) : null}
        </View>

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
    justifyContent: 'flex-end',
    padding: 16,
  },
  responseCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e3e3e3',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  responseLabel: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.6,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
  },
  metricsCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e3e3e3',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  metricsTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricsNote: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.65,
    marginBottom: 8,
  },
  metricText: {
    fontSize: 14,
    lineHeight: 20,
  },
  resetText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: '#cc7a00',
  },
  loadingContainer: {
    height: 40,
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    width: '100%',
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
