import { Canvas } from "@shopify/react-native-skia";
import { SkiaNumberFlow, useSkiaFont } from "number-flow-react-native/skia";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import {
  REC_CANVAS_HEIGHT,
  REC_CANVAS_WIDTH,
  REC_FONT_ASSET,
  REC_FONT_SIZE,
  REC_TEXT_COLOR,
} from "./constants";
import { SliderThumb, THUMB_SIZE } from "./SliderThumb";

const TRACK_WIDTH = 340;
const TRACK_HEIGHT = 52;
const MIN_VALUE = 0;
const MAX_VALUE = 999.9;

export const RecordingScrubbingDemo = () => {
  const skiaFont = useSkiaFont(REC_FONT_ASSET, REC_FONT_SIZE);

  const thumbX = useSharedValue(TRACK_WIDTH / 2);
  const isPressed = useSharedValue(false);

  const formattedValue = useDerivedValue(() => {
    const ratio = Math.max(0, Math.min(1, thumbX.value / TRACK_WIDTH));
    const value = MIN_VALUE + ratio * (MAX_VALUE - MIN_VALUE);
    return value.toFixed(1);
  });

  const panGesture = Gesture.Pan()
    .onBegin(({ x }) => {
      "worklet";
      isPressed.value = true;
      thumbX.value = Math.max(0, Math.min(TRACK_WIDTH, x));
    })
    .onUpdate(({ x }) => {
      "worklet";
      thumbX.value = Math.max(0, Math.min(TRACK_WIDTH, x));
    })
    .onFinalize(() => {
      "worklet";
      isPressed.value = false;
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value - THUMB_SIZE / 2 }],
  }));

  const trackFillStyle = useAnimatedStyle(() => ({
    width: thumbX.value,
  }));

  return (
    <View style={{ alignItems: "center", padding: 32 }}>
      {/* Number display */}
      <Canvas style={{ width: REC_CANVAS_WIDTH, height: REC_CANVAS_HEIGHT }}>
        <SkiaNumberFlow
          color={REC_TEXT_COLOR}
          font={skiaFont}
          sharedValue={formattedValue}
          suffix=" mg"
          textAlign="center"
          width={REC_CANVAS_WIDTH}
          y={REC_FONT_SIZE + 4}
        />
      </Canvas>

      {/* Slider */}
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
              height: 8,
              width: TRACK_WIDTH,
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: 4,
            }}
          />

          {/* Track fill */}
          <Animated.View
            style={[
              {
                position: "absolute",
                height: 8,
                backgroundColor: "#fff",
                borderRadius: 4,
              },
              trackFillStyle,
            ]}
          />

          {/* Thumb */}
          <SliderThumb
            style={thumbStyle}
            thumbStyle={{
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: THUMB_SIZE / 2,
              backgroundColor: "#fff",
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.3)",
            }}
            isPressed={isPressed}
          />
        </View>
      </GestureDetector>
    </View>
  );
};
