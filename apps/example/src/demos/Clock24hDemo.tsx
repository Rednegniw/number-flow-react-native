import { Canvas } from "@shopify/react-native-skia";
import { TimeFlow } from "number-flow-react-native/native";
import { SkiaTimeFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { FONT_REGULAR, INTER_FONT_ASSET } from "../theme/fonts";
import { randomInt } from "./utils";

const FONT_SIZE = 28;
const CANVAS_WIDTH = 280;
const CANVAS_HEIGHT = 40;

function useClock24hDemoState() {
  const [hours, setHours] = useState(14);
  const [minutes, setMinutes] = useState(30);

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

  return { hours, minutes, increment, randomize };
}

export const Clock24hDemoNative = () => {
  const { hours, minutes, increment, randomize } = useClock24hDemoState();

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
          minutes={minutes}
          style={{ fontFamily: FONT_REGULAR, fontSize: FONT_SIZE, color: colors.accent }}
          textAlign="center"
        />
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={increment}
          style={{
            flex: 1,
            backgroundColor: colors.buttonBackground,
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>
            +1 Minute
          </Text>
        </Pressable>

        <Pressable
          onPress={randomize}
          style={{
            flex: 1,
            backgroundColor: colors.buttonBackground,
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>Random</Text>
        </Pressable>
      </View>
    </View>
  );
};

export const Clock24hDemoSkia = () => {
  const skiaFont = useSkiaFont(INTER_FONT_ASSET, FONT_SIZE);
  const { hours, minutes, increment, randomize } = useClock24hDemoState();

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
            minutes={minutes}
            textAlign="center"
            width={CANVAS_WIDTH}
            y={FONT_SIZE}
          />
        </Canvas>
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={increment}
          style={{
            flex: 1,
            backgroundColor: colors.buttonBackground,
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>
            +1 Minute
          </Text>
        </Pressable>

        <Pressable
          onPress={randomize}
          style={{
            flex: 1,
            backgroundColor: colors.buttonBackground,
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>Random</Text>
        </Pressable>
      </View>
    </View>
  );
};
