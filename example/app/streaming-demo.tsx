import { useCallback } from 'react'
import {
  createTool,
  LanguageModelSession,
  useStreamingResponse,
} from 'react-native-foundation-models'
import { z } from 'zod'
import { WeatherDemo } from '@/components/WeatherDemo'
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

      return {
        temperature: result.main.temp,
        humidity: result.main.humidity || 0,
        precipitation: result.weather?.[0]?.description || 'Unknown',
        units: 'imperial',
      }
    } catch (error) {
      console.error('Weather tool error:', error)
      return weatherResult()
    }
  },
})

const session = new LanguageModelSession({
  instructions:
    'You are a helpful assistant. When users ask about weather, use the weather tool to get current information.',
  tools: [weatherTool],
})

export default function StreamingDemoScreen() {
  const { response, isStreaming, error, streamResponse, reset } =
    useStreamingResponse(session)

  const handleSubmit = useCallback(
    async (prompt: string) => {
      await streamResponse(prompt)
    },
    [streamResponse],
  )

  return (
    <WeatherDemo
      response={response}
      isLoading={isStreaming}
      error={error}
      onSubmit={handleSubmit}
      onReset={reset}
    />
  )
}
