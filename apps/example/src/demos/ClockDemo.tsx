import { Canvas } from "@shopify/react-native-skia";
import { TimeFlow } from "number-flow-react-native/native";
import { SkiaTimeFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
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
import { randomInt } from "./utils";

function useClockDemoState() {
  const [hours, setHours] = useState(14);
  const [minutes, setMinutes] = useState(30);
  const [is24Hour, setIs24Hour] = useState(true);

  const increment = useCallback(() => {
    setMinutes((prev) => {
      if (prev === 59) {
        setHours((h) => (h + 1) % 24);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const randomize = useCallback(() => {
    setHours(randomInt(0, 23));
    setMinutes(randomInt(0, 59));
  }, []);

  const toggle24h = useCallback(() => {
    setIs24Hour((v) => !v);
  }, []);

  return { hours, minutes, is24Hour, increment, randomize, toggle24h };
}

export const ClockDemoNative = () => {
  const { hours, minutes, is24Hour, increment, randomize, toggle24h } = useClockDemoState();

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
          padHours={false}
          style={{ fontFamily: DEMO_FONT_FAMILY, fontSize: DEMO_FONT_SIZE, color: DEMO_TEXT_COLOR }}
          textAlign="center"
        />
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <DemoButton label="+1 Minute" onPress={increment} style={{ flex: 1 }} />
        <DemoButton label="Random" onPress={randomize} style={{ flex: 1 }} />
        <DemoButton label={is24Hour ? "12h" : "24h"} onPress={toggle24h} style={{ flex: 1 }} />
      </View>
    </View>
  );
};

export const ClockDemoSkia = () => {
  const skiaFont = useSkiaFont(DEMO_SKIA_FONT_ASSET, DEMO_FONT_SIZE);
  const { hours, minutes, is24Hour, increment, randomize, toggle24h } = useClockDemoState();

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
            padHours={false}
            textAlign="center"
            width={CANVAS_WIDTH}
            y={DEMO_FONT_SIZE}
          />
        </Canvas>
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <DemoButton label="+1 Minute" onPress={increment} style={{ flex: 1 }} />
        <DemoButton label="Random" onPress={randomize} style={{ flex: 1 }} />
        <DemoButton label={is24Hour ? "12h" : "24h"} onPress={toggle24h} style={{ flex: 1 }} />
      </View>
    </View>
  );
};
