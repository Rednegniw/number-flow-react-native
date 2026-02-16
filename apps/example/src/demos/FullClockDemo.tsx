import { Canvas, useFont } from "@shopify/react-native-skia";
import { TimeFlow } from "number-flow-react-native/native";
import { SkiaTimeFlow } from "number-flow-react-native/skia";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { FONT_REGULAR, INTER_FONT_ASSET } from "../theme/fonts";

const FONT_SIZE = 30;
const CANVAS_WIDTH = 280;
const CANVAS_HEIGHT = 44;

function useFullClockDemoState() {
  const [is24Hour, setIs24Hour] = useState(true);
  const [hours, setHours] = useState(() => new Date().getHours());
  const [minutes, setMinutes] = useState(() => new Date().getMinutes());
  const [seconds, setSeconds] = useState(() => new Date().getSeconds());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setHours(d.getHours());
      setMinutes(d.getMinutes());
      setSeconds(d.getSeconds());
    };
    update();
    intervalRef.current = setInterval(update, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const toggle24h = useCallback(() => {
    setIs24Hour((v) => !v);
  }, []);

  return { hours, minutes, seconds, is24Hour, toggle24h };
}

export const FullClockDemoNative = () => {
  const { hours, minutes, seconds, is24Hour, toggle24h } = useFullClockDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* Time display */}
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
        <TimeFlow
          containerStyle={{ width: CANVAS_WIDTH }}
          hours={hours}
          is24Hour={is24Hour}
          minutes={minutes}
          seconds={seconds}
          style={{ fontFamily: FONT_REGULAR, fontSize: FONT_SIZE, color: colors.accent }}
          textAlign="center"
        />
      </View>

      {/* Action button */}
      <Pressable
        onPress={toggle24h}
        style={{
          backgroundColor: colors.buttonBackground,
          borderRadius: 8,
          padding: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>
          Toggle 12h/24h
        </Text>
      </Pressable>
    </View>
  );
};

export const FullClockDemoSkia = () => {
  const skiaFont = useFont(INTER_FONT_ASSET, FONT_SIZE);
  const { hours, minutes, seconds, is24Hour, toggle24h } = useFullClockDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* Time display */}
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
        <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <SkiaTimeFlow
            color={colors.accent}
            font={skiaFont}
            hours={hours}
            is24Hour={is24Hour}
            minutes={minutes}
            seconds={seconds}
            textAlign="center"
            width={CANVAS_WIDTH}
            y={FONT_SIZE}
          />
        </Canvas>
      </View>

      {/* Action button */}
      <Pressable
        onPress={toggle24h}
        style={{
          backgroundColor: colors.buttonBackground,
          borderRadius: 8,
          padding: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>
          Toggle 12h/24h
        </Text>
      </Pressable>
    </View>
  );
};
