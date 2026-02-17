import { Canvas } from "@shopify/react-native-skia";
import { TimeFlow } from "number-flow-react-native/native";
import { SkiaTimeFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { FONT_REGULAR, INTER_FONT_ASSET } from "../theme/fonts";

const FONT_SIZE = 40;
const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 56;

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
          style={{ fontFamily: FONT_REGULAR, fontSize: FONT_SIZE, color: "#FF3B30" }}
          textAlign="center"
          trend={-1}
        />
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={toggle}
          style={{
            flex: 1,
            backgroundColor: colors.buttonBackground,
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>
            Start / Pause
          </Text>
        </Pressable>

        <Pressable
          onPress={reset}
          style={{
            flex: 1,
            backgroundColor: colors.buttonBackground,
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
};

export const CountdownDemoSkia = () => {
  const skiaFont = useSkiaFont(INTER_FONT_ASSET, FONT_SIZE);
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
            color="#FF3B30"
            font={skiaFont}
            minutes={minutes}
            seconds={seconds}
            textAlign="center"
            trend={-1}
            width={CANVAS_WIDTH}
            y={FONT_SIZE}
          />
        </Canvas>
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={toggle}
          style={{
            flex: 1,
            backgroundColor: colors.buttonBackground,
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>
            Start / Pause
          </Text>
        </Pressable>

        <Pressable
          onPress={reset}
          style={{
            flex: 1,
            backgroundColor: colors.buttonBackground,
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
};
