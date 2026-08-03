import { type RefObject, useEffect, useRef, useState } from 'react'
import { Keyboard, type View } from 'react-native'

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
