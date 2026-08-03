import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native'
import { Text, useThemeColor } from '@/components/Themed'
import { formatNumber } from '@/utils/formatNumber'

export type ContextPressure = 'ok' | 'warn' | 'critical'

/**
 * Maps how full the context window is to a severity level, which drives the
 * meter's colour. The session summarises and resets itself once the window
 * fills, so "critical" means "a reset is imminent", not "something is wrong".
 *
 * TODO(henry): tune these thresholds.
 * This is a judgement call rather than a fact, and it changes how the demo
 * feels. Warning early (say 0.6) makes context pressure legible while there is
 * still room to act, but leaves the meter amber for most of a normal session,
 * which reads as noise. Warning late (say 0.9) keeps the meter calm but gives
 * almost no notice before a reset drops conversational history.
 */
export function getContextPressure(fraction: number): ContextPressure {
  if (fraction >= 0.9) return 'critical'
  if (fraction >= 0.75) return 'warn'
  return 'ok'
}

interface ContextMeterProps {
  used?: number
  total?: number
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    let active = true
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) setReduced(value)
    })
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
    return () => {
      active = false
      sub.remove()
    }
  }, [])

  return reduced
}

export function ContextMeter({ used, total }: ContextMeterProps) {
  const trackColor = useThemeColor({}, 'track')
  const tintColor = useThemeColor({}, 'tint')
  const warnColor = useThemeColor({}, 'warn')
  const dangerColor = useThemeColor({}, 'danger')
  const reducedMotion = useReducedMotion()

  const hasReading = typeof used === 'number' && typeof total === 'number' && total > 0
  const fraction = hasReading ? Math.min(used / total, 1) : 0
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(fraction)
      return
    }
    const animation = Animated.timing(progress, {
      toValue: fraction,
      duration: 420,
      useNativeDriver: false,
    })
    animation.start()
    return () => animation.stop()
  }, [fraction, progress, reducedMotion])

  const fillColor = { ok: tintColor, warn: warnColor, critical: dangerColor }[
    getContextPressure(fraction)
  ]

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Context window used"
      accessibilityValue={
        hasReading ? { min: 0, max: total, now: used } : { text: 'No reading yet' }
      }
    >
      <View style={styles.row}>
        <Text style={styles.label}>Context window</Text>
        <Text style={styles.value}>
          {hasReading ? formatNumber(used) : '—'} / {formatNumber(total)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: fillColor,
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
  },
  value: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
})
