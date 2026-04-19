export function formatNumber(value: number | undefined): string {
  if (typeof value !== 'number') {
    return 'Unknown'
  }

  return new Intl.NumberFormat().format(value)
}
