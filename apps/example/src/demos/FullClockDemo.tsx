import { Canvas } from "@shopify/react-native-skia";
import { TimeFlow } from "number-flow-react-native/native";
import { SkiaTimeFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { DemoButton } from "../components/DemoButton";
import { colors } from "../theme/colors";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEMO_FONT_FAMILY,
  DEMO_FONT_SIZE,
  DEMO_SKIA_FONT_ASSET,
  DEMO_TEXT_COLOR,
} from "../theme/demoConstants";

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
          style={{
            fontFamily: DEMO_FONT_FAMILY,
            fontSize: DEMO_FONT_SIZE,
            color: DEMO_TEXT_COLOR,
            textAlign: "center",
          }}
        />
      </View>

      {/* Action button */}
      <DemoButton label="Toggle 12h/24h" onPress={toggle24h} />
    </View>
  );
};

export const FullClockDemoSkia = () => {
  const skiaFont = useSkiaFont(DEMO_SKIA_FONT_ASSET, DEMO_FONT_SIZE);
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
            color={DEMO_TEXT_COLOR}
            font={skiaFont}
            hours={hours}
            is24Hour={is24Hour}
            minutes={minutes}
            seconds={seconds}
            textAlign="center"
            width={CANVAS_WIDTH}
            y={DEMO_FONT_SIZE}
          />
        </Canvas>
      </View>

      {/* Action button */}
      <DemoButton label="Toggle 12h/24h" onPress={toggle24h} />
    </View>
  );
};
