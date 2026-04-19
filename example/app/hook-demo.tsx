import { useState } from 'react'
import {
  createTool,
  getFoundationModelsContextSize,
  useLanguageModel,
} from 'react-native-foundation-models'
import { z } from 'zod'
import { WeatherDemo } from '@/components/WeatherDemo'
import { getTokenMetrics, type TokenMetrics } from '@/utils/tokenMetrics'
import { weatherResult } from '@/utils/weatherResult'

const WEATHER_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather?units=imperial'
const options = {
  method: 'GET',
  headers: { accept: 'application/json', 'accept-encoding': 'deflate, gzip, br' },
}

const weatherTool = createTool({
  name: 'weather_tool',
  description: 'A weather tool that can get current weather information for any city.',
  arguments: z.object({
    city: z.string(),
  }),
  handler: async args => {
    try {
      const url = `${BASE_URL}&q=${args.city}&APPID=${WEATHER_API_KEY}`
      const res = await fetch(url, options)
      const result = await res.json()

      if (!result.main) {
        throw new Error(`Invalid API response structure: ${JSON.stringify(result)}`)
      }

      return weatherResult(result.main)
    } catch (error) {
      console.error('Weather tool error:', error)
      return weatherResult()
    }
  },
})

const tools = [weatherTool]
const contextSize = getFoundationModelsContextSize()

export default function HookDemoScreen() {
  const [tokenMetrics, setTokenMetrics] = useState<TokenMetrics>()
  const [contextReset, setContextReset] = useState(false)
  const { response, loading, error, send, reset, isSessionReady, session } =
    useLanguageModel({
      instructions: 'You are a helpful assistant',
      tools,
    })

  const handleSubmit = async (prompt: string) => {
    if (!isSessionReady) {
      console.error('Session is not ready')
      return
    }

    try {
      setTokenMetrics(undefined)
      setContextReset(false)
      const fullResponse = await send(prompt)
      setTokenMetrics(getTokenMetrics(prompt, fullResponse))
      setContextReset(Boolean(session?.wasContextReset))
    } catch (err) {
      console.error('Failed to send prompt:', err)
      setTokenMetrics(undefined)
      setContextReset(Boolean(session?.wasContextReset))
    }
  }

  const handleReset = () => {
    reset()
    setTokenMetrics(undefined)
    setContextReset(false)
  }

  return (
    <WeatherDemo
      response={response}
      isLoading={loading}
      error={error}
      onSubmit={handleSubmit}
      onReset={handleReset}
      metrics={{
        contextSize,
        tokens: tokenMetrics,
        contextReset,
      }}
    />
  )
}
