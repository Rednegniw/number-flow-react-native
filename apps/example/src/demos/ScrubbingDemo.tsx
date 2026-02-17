import { Canvas } from "@shopify/react-native-skia";
import { NumberFlow } from "number-flow-react-native/native";
import { SkiaNumberFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { colors } from "../theme/colors";
import { FONT_REGULAR, INTER_FONT_ASSET } from "../theme/fonts";

const SKIA_FONT_SIZE = 28;
const CANVAS_WIDTH = 280;
const CANVAS_HEIGHT = 46;

const TRACK_WIDTH = 280;
const TRACK_HEIGHT = 40;
const THUMB_SIZE = 28;
const MIN_VALUE = 0;
const MAX_VALUE = 999.9;

// Shared slider track component
const SliderTrack = ({
  thumbStyle,
  trackFillStyle,
  panGesture,
}: {
  thumbStyle: ReturnType<typeof useAnimatedStyle>;
  trackFillStyle: ReturnType<typeof useAnimatedStyle>;
  panGesture: ReturnType<typeof Gesture.Pan>;
}) => (
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
            backgroundColor: colors.accent,
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
            borderColor: colors.accent,
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
);

export const ScrubbingDemoSkia = () => {
  const skiaFont = useSkiaFont(INTER_FONT_ASSET, SKIA_FONT_SIZE);

  const thumbX = useSharedValue(TRACK_WIDTH / 2);
  const isScrubbing = useSharedValue(false);
  const [lastValue, setLastValue] = useState(Math.round((MAX_VALUE / 2) * 10) / 10);

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
      const value = Math.round((MIN_VALUE + ratio * (MAX_VALUE - MIN_VALUE)) * 10) / 10;
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
      {/* Description */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        Drag the slider — digits update on the UI thread via sharedValue
      </Text>

      {/* Number display */}
      <View
        style={{
          backgroundColor: colors.demoBackground,
          borderRadius: 12,
          padding: 12,
          alignItems: "center",
        }}
      >
        <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <SkiaNumberFlow
            color={colors.accent}
            font={skiaFont}
            sharedValue={formattedValue}
            suffix=" mg"
            textAlign="center"
            width={CANVAS_WIDTH}
            y={SKIA_FONT_SIZE + 4}
          />
        </Canvas>
      </View>

      {/* Slider */}
      <SliderTrack
        panGesture={panGesture}
        thumbStyle={thumbStyle}
        trackFillStyle={trackFillStyle}
      />

      {/* Last committed value */}
      <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: "center" }}>
        Last value: {lastValue.toFixed(1)} mg
      </Text>
    </View>
  );
};

export const ScrubbingDemoNative = () => {
  const thumbX = useSharedValue(TRACK_WIDTH / 2);
  const [value, setValue] = useState(Math.round((MAX_VALUE / 2) * 10) / 10);

  const updateValue = useCallback((v: number) => {
    setValue(v);
  }, []);

  const panGesture = Gesture.Pan()
    .onStart(({ x }) => {
      "worklet";
      const clamped = Math.max(0, Math.min(TRACK_WIDTH, x));
      thumbX.value = clamped;
      const ratio = clamped / TRACK_WIDTH;
      const v = Math.round((MIN_VALUE + ratio * (MAX_VALUE - MIN_VALUE)) * 10) / 10;
      runOnJS(updateValue)(v);
    })
    .onUpdate(({ x }) => {
      "worklet";
      const clamped = Math.max(0, Math.min(TRACK_WIDTH, x));
      thumbX.value = clamped;
      const ratio = clamped / TRACK_WIDTH;
      const v = Math.round((MIN_VALUE + ratio * (MAX_VALUE - MIN_VALUE)) * 10) / 10;
      runOnJS(updateValue)(v);
    })
    .onEnd(() => {
      "worklet";
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value - THUMB_SIZE / 2 }],
  }));

  const trackFillStyle = useAnimatedStyle(() => ({
    width: thumbX.value,
  }));

  return (
    <View style={{ gap: 8 }}>
      {/* Description */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        Drag the slider — updates via runOnJS (compare with Skia for smoother scrubbing)
      </Text>

      {/* Number display */}
      <View
        style={{
          backgroundColor: colors.demoBackground,
          borderRadius: 12,
          padding: 20,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 70,
        }}
      >
        <NumberFlow
          containerStyle={{ width: CANVAS_WIDTH }}
          format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
          style={{ fontFamily: FONT_REGULAR, fontSize: SKIA_FONT_SIZE, color: colors.accent }}
          suffix=" mg"
          textAlign="center"
          value={value}
        />
      </View>

      {/* Slider */}
      <SliderTrack
        panGesture={panGesture}
        thumbStyle={thumbStyle}
        trackFillStyle={trackFillStyle}
      />

      {/* Current value */}
      <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: "center" }}>
        Value: {value.toFixed(1)} mg
      </Text>
    </View>
  );
};
