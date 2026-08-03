/**
 * Semantic colours mirroring Apple's system palette, so the demo reads as a
 * first-party iOS 26 app. Both schemes must declare the same keys — the
 * `useThemeColor` signature in components/Themed.tsx keys off their intersection.
 */
const tintColorLight = '#007AFF' // systemBlue (light)
const tintColorDark = '#0A84FF' // systemBlue (dark)

export default {
  light: {
    text: '#000000',
    muted: 'rgba(60, 60, 67, 0.6)', // secondaryLabel
    background: '#FFFFFF',
    card: '#F2F2F7', // systemGroupedBackground
    border: 'rgba(60, 60, 67, 0.29)', // separator
    track: '#E5E5EA', // systemGray5
    warn: '#FF9500', // systemOrange
    danger: '#FF3B30', // systemRed
    tint: tintColorLight,
    tabIconDefault: 'rgba(60, 60, 67, 0.6)',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#FFFFFF',
    muted: 'rgba(235, 235, 245, 0.6)', // secondaryLabel
    background: '#000000',
    card: '#1C1C1E', // systemGray6
    border: 'rgba(84, 84, 88, 0.65)', // separator
    track: '#2C2C2E', // systemGray5
    warn: '#FF9F0A', // systemOrange
    danger: '#FF453A', // systemRed
    tint: tintColorDark,
    tabIconDefault: 'rgba(235, 235, 245, 0.6)',
    tabIconSelected: tintColorDark,
  },
}
