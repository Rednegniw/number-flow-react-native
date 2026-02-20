import type { StyleProp, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export const THUMB_SIZE = 36;

const RIPPLE_SIZE = THUMB_SIZE * 1.8;
const RIPPLE_OFFSET = (RIPPLE_SIZE - THUMB_SIZE) / 2;

const SCALE_UP_CONFIG = { duration: 150 };
const SCALE_DOWN_CONFIG = { duration: 200 };
const RIPPLE_IN_CONFIG = { duration: 200 };
const RIPPLE_FADE_CONFIG = { duration: 350 };

interface SliderThumbProps {
  style: StyleProp<ViewStyle>;
  thumbStyle: StyleProp<ViewStyle>;
  isPressed: SharedValue<boolean>;
}

export const SliderThumb = ({ style, thumbStyle, isPressed }: SliderThumbProps) => {
  const thumbScale = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  useAnimatedReaction(
    () => isPressed.value,
    (pressed, previous) => {
      if (pressed && !previous) {
        thumbScale.value = withTiming(1.15, SCALE_UP_CONFIG);
        rippleScale.value = 0;
        rippleOpacity.value = 0.3;
        rippleScale.value = withTiming(1, RIPPLE_IN_CONFIG);
      } else if (!pressed && previous) {
        thumbScale.value = withTiming(1, SCALE_DOWN_CONFIG);
        rippleOpacity.value = withTiming(0, RIPPLE_FADE_CONFIG);
      }
    },
  );

  const scaleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: thumbScale.value }],
  }));

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          overflow: "visible",
        },
        style,
      ]}
    >
      {/* Ripple */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: -RIPPLE_OFFSET,
            left: -RIPPLE_OFFSET,
            width: RIPPLE_SIZE,
            height: RIPPLE_SIZE,
            borderRadius: RIPPLE_SIZE / 2,
            backgroundColor: "rgba(255,255,255,0.15)",
          },
          rippleAnimatedStyle,
        ]}
      />

      {/* Thumb circle */}
      <Animated.View style={[thumbStyle, scaleAnimatedStyle]} />
    </Animated.View>
  );
};
