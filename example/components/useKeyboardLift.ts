import { type RefObject, useEffect, useRef, useState } from 'react'
import { Keyboard, type View } from 'react-native'

/**
 * Returns how far a bottom-pinned view must move up to sit directly on the
 * keyboard.
 *
 * `KeyboardAvoidingView` is not reliable here: the screen sits inside a native
 * tab bar, so its padding stacks with the tab bar inset and the safe area, and
 * there is no public hook for the native tab bar's height to subtract. Instead
 * of guessing those numbers, this measures where the bar actually is and lifts
 * it by exactly the overlap with the keyboard.
 *
 * `measureInWindow` reports the bar where it is *now*, which already includes
 * any active lift, so the current lift is added back to recover the resting
 * position. That keeps the result stable when the keyboard resizes (autocomplete
 * bar appearing, a hardware keyboard connecting) instead of drifting each event.
 */
export function useKeyboardLift(ref: RefObject<View | null>, gap = 0) {
  const [lift, setLift] = useState(0)
  const liftRef = useRef(0)

  useEffect(() => {
    liftRef.current = lift
  }, [lift])

  useEffect(() => {
    const onChange = (event: { endCoordinates: { screenY: number } }) => {
      const node = ref.current

      if (!node) {
        return
      }

      node.measureInWindow((_x, y, _width, height) => {
        const restingBottom = y + height + liftRef.current
        const overlap = restingBottom - event.endCoordinates.screenY
        // `gap` is only added once the keyboard actually overlaps the view.
        // Adding it unconditionally would nudge the view upward on frame
        // events fired while the keyboard is off screen.
        setLift(overlap > 0 ? overlap + gap : 0)
      })
    }

    const showSub = Keyboard.addListener('keyboardWillChangeFrame', onChange)
    const hideSub = Keyboard.addListener('keyboardWillHide', () => setLift(0))

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [ref, gap])

  return lift
}
