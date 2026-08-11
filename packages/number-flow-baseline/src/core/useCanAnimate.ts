import { useReducedMotion } from "react-native-reanimated";

/**
 * Returns whether NumberFlow animations are currently enabled.
 *
 * Use this to conditionally render UI based on animation support:
 * ```tsx
 * const canAnimate = useCanAnimate();
 * return canAnimate ? <NumberFlow value={42} /> : <Text>42</Text>;
 * ```
 *
 * When `respectMotionPreference` is true (default), returns false
 * if the device's "Reduce Motion" accessibility setting is on.
 */
export function useCanAnimate(respectMotionPreference = true): boolean {
  const reducedMotion = useReducedMotion();

  if (!respectMotionPreference) return true;

  return !reducedMotion;
}
