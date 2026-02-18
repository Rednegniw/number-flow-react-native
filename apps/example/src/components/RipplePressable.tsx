import type React from "react";
import type { ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export interface RipplePressableProps {
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  rippleColor?: string;
  children: React.ReactNode;
}

const FADE_OUT_CONFIG = { duration: 350 };

export const RipplePressable = ({
  onPress,
  style,
  rippleColor = "rgba(0, 0, 0, 0.08)",
  children,
}: RipplePressableProps) => {
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  const tapGesture = Gesture.Tap()
    .onBegin((e) => {
      "worklet";
      touchX.value = e.x;
      touchY.value = e.y;
      scale.value = 0;
      opacity.value = 1;
      scale.value = withTiming(1, { duration: 200 });
    })
    .onEnd(() => {
      "worklet";
      if (onPress) runOnJS(onPress)();
      opacity.value = withTiming(0, FADE_OUT_CONFIG);
    })
    .onTouchesUp(() => {
      "worklet";
      opacity.value = withTiming(0, FADE_OUT_CONFIG);
    })
    .onTouchesCancelled(() => {
      "worklet";
      opacity.value = withTiming(0, FADE_OUT_CONFIG);
    });

  const rippleAnimatedStyle = useAnimatedStyle(() => {
    const maxRadius = Math.sqrt(
      Math.max(touchX.value, width.value - touchX.value) ** 2 +
        Math.max(touchY.value, height.value - touchY.value) ** 2,
    );
    const diameter = maxRadius * 2;

    return {
      position: "absolute",
      left: touchX.value - maxRadius,
      top: touchY.value - maxRadius,
      width: diameter,
      height: diameter,
      borderRadius: maxRadius,
      backgroundColor: rippleColor,
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        onLayout={(e) => {
          width.value = e.nativeEvent.layout.width;
          height.value = e.nativeEvent.layout.height;
        }}
        style={[{ overflow: "hidden" }, style]}
      >
        <Animated.View pointerEvents="none" style={rippleAnimatedStyle} />
        {children}
      </Animated.View>
    </GestureDetector>
  );
};
