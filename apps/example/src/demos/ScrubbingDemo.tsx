import { Canvas, useFont } from "@shopify/react-native-skia";
import { SkiaNumberFlow } from "number-flow-react-native/skia";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { useCallback, useState } from "react";

const SKIA_FONT_SIZE = 28;
const CANVAS_WIDTH = 280;
const CANVAS_HEIGHT = 46;

const TRACK_WIDTH = 280;
const TRACK_HEIGHT = 40;
const THUMB_SIZE = 28;
const MIN_VALUE = 0;
const MAX_VALUE = 999.9;

export const ScrubbingDemo = () => {
  const skiaFont = useFont(
    require("../../assets/fonts/SpaceMono-Regular.ttf"),
    SKIA_FONT_SIZE,
  );

  const thumbX = useSharedValue(TRACK_WIDTH / 2);
  const isScrubbing = useSharedValue(false);
  const [lastValue, setLastValue] = useState(
    Math.round((MAX_VALUE / 2) * 10) / 10,
  );

  const updateLastValue = useCallback((v: number) => {
    setLastValue(v);
  }, []);

  // Map thumb position to numeric value on the UI thread
  const formattedValue = useDerivedValue(() => {
    if (!isScrubbing.value) return "";
    const ratio = Math.max(0, Math.min(1, thumbX.value / TRACK_WIDTH));
    const value = MIN_VALUE + ratio * (MAX_VALUE - MIN_VALUE);
    return value.toFixed(1);
  });

  const panGesture = Gesture.Pan()
    .onStart(({ x }) => {
      "worklet";
      isScrubbing.value = true;
      thumbX.value = Math.max(0, Math.min(TRACK_WIDTH, x));
    })
    .onUpdate(({ x }) => {
      "worklet";
      thumbX.value = Math.max(0, Math.min(TRACK_WIDTH, x));
    })
    .onEnd(() => {
      "worklet";
      isScrubbing.value = false;
      const ratio = Math.max(0, Math.min(1, thumbX.value / TRACK_WIDTH));
      const value =
        Math.round((MIN_VALUE + ratio * (MAX_VALUE - MIN_VALUE)) * 10) / 10;
      runOnJS(updateLastValue)(value);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value - THUMB_SIZE / 2 }],
  }));

  const trackFillStyle = useAnimatedStyle(() => ({
    width: thumbX.value,
  }));

  return (
    <View style={{ gap: 8 }}>
      {/* Header */}
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#333" }}>
        Scrubbing (SharedValue)
      </Text>
      <Text style={{ fontSize: 11, color: "#999" }}>
        Drag the slider — digits update on the UI thread via sharedValue
      </Text>

      {/* Number display */}
      <View
        style={{
          backgroundColor: "#f5f5f5",
          borderRadius: 12,
          padding: 12,
          alignItems: "center",
        }}
      >
        <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <SkiaNumberFlow
            color="#007AFF"
            font={skiaFont}
            format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
            sharedValue={formattedValue}
            suffix=" mg"
            textAlign="center"
            width={CANVAS_WIDTH}
            y={SKIA_FONT_SIZE + 4}
          />
        </Canvas>
      </View>

      {/* Slider track */}
      <GestureDetector gesture={panGesture}>
        <View
          style={{
            height: TRACK_HEIGHT,
            justifyContent: "center",
            alignSelf: "center",
            width: TRACK_WIDTH,
          }}
        >
          {/* Track background */}
          <View
            style={{
              position: "absolute",
              height: 6,
              width: TRACK_WIDTH,
              backgroundColor: "#e0e0e0",
              borderRadius: 3,
            }}
          />

          {/* Track fill */}
          <Animated.View
            style={[
              {
                position: "absolute",
                height: 6,
                backgroundColor: "#007AFF",
                borderRadius: 3,
              },
              trackFillStyle,
            ]}
          />

          {/* Thumb */}
          <Animated.View
            style={[
              {
                position: "absolute",
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: THUMB_SIZE / 2,
                backgroundColor: "#fff",
                borderWidth: 2,
                borderColor: "#007AFF",
                elevation: 3,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
              },
              thumbStyle,
            ]}
          />
        </View>
      </GestureDetector>

      {/* Last committed value */}
      <Text style={{ fontSize: 11, color: "#999", textAlign: "center" }}>
        Last value: {lastValue.toFixed(1)} mg
      </Text>
    </View>
  );
};
