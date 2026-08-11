export type WeatherUnits = 'celsius' | 'fahrenheit'

export function weatherResult(data?: any, units: WeatherUnits = 'fahrenheit') {
  if (!data?.main) {
    return {
      available: false,
      conditions: 'unknown',
      readings: { temperature: 0, humidity: 0 },
      units,
    }
  }
  return {
    available: true,
    conditions: data.weather?.[0]?.description || 'unknown',
    readings: { temperature: data.main.temp, humidity: data.main.humidity },
    units,
  }
}
