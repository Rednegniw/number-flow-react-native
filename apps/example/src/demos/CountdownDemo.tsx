import { Canvas } from "@shopify/react-native-skia";
import { TimeFlow } from "number-flow-react-native/native";
import { SkiaTimeFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { DemoButton } from "../components/DemoButton";
import { colors } from "../theme/colors";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEMO_FONT_FAMILY,
  DEMO_FONT_SIZE,
  DEMO_SKIA_FONT_ASSET,
} from "../theme/demoConstants";

function useCountdownDemoState() {
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(30);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggle = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s === 0) {
            setMinutes((m) => {
              if (m === 0) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                intervalRef.current = null;
                return 0;
              }
              return m - 1;
            });
            return 59;
          }
          return s - 1;
        });
      }, 1000);
    }
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setMinutes(5);
    setSeconds(30);
  }, []);

  return { minutes, seconds, toggle, reset };
}

export const CountdownDemoNative = () => {
  const { minutes, seconds, toggle, reset } = useCountdownDemoState();

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
          minutes={minutes}
          seconds={seconds}
          style={{
            fontFamily: DEMO_FONT_FAMILY,
            fontSize: DEMO_FONT_SIZE,
            color: colors.countdown,
            textAlign: "center",
          }}
          trend={-1}
        />
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <DemoButton label="Start / Pause" onPress={toggle} style={{ flex: 1 }} />
        <DemoButton label="Reset" onPress={reset} style={{ flex: 1 }} />
      </View>
    </View>
  );
};

export const CountdownDemoSkia = () => {
  const skiaFont = useSkiaFont(DEMO_SKIA_FONT_ASSET, DEMO_FONT_SIZE);
  const { minutes, seconds, toggle, reset } = useCountdownDemoState();

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
            color={colors.countdown}
            font={skiaFont}
            minutes={minutes}
            seconds={seconds}
            textAlign="center"
            trend={-1}
            width={CANVAS_WIDTH}
            y={DEMO_FONT_SIZE}
          />
        </Canvas>
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <DemoButton label="Start / Pause" onPress={toggle} style={{ flex: 1 }} />
        <DemoButton label="Reset" onPress={reset} style={{ flex: 1 }} />
      </View>
    </View>
  );
};
