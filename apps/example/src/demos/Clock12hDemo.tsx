import { Canvas } from "@shopify/react-native-skia";
import { TimeFlow } from "number-flow-react-native/native";
import { SkiaTimeFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { FONT_REGULAR, INTER_FONT_ASSET } from "../theme/fonts";

const FONT_SIZE = 34;
const CANVAS_WIDTH = 280;
const CANVAS_HEIGHT = 48;

function useClock12hDemoState() {
  const [hours, setHours] = useState(14);
  const [minutes, setMinutes] = useState(30);
  const [is24Hour, setIs24Hour] = useState(false);

  const increment = useCallback(() => {
    setMinutes((prev) => {
      if (prev === 59) {
        setHours((h) => (h + 1) % 24);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const toggle24h = useCallback(() => {
    setIs24Hour((v) => !v);
  }, []);

  return { hours, minutes, is24Hour, increment, toggle24h };
}

export const Clock12hDemoNative = () => {
  const { hours, minutes, is24Hour, increment, toggle24h } = useClock12hDemoState();

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
          onPress={toggle24h}
          style={{
            flex: 1,
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
    </View>
  );
};

export const Clock12hDemoSkia = () => {
  const skiaFont = useSkiaFont(INTER_FONT_ASSET, FONT_SIZE);
  const { hours, minutes, is24Hour, increment, toggle24h } = useClock12hDemoState();

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
            padHours={false}
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
          onPress={toggle24h}
          style={{
            flex: 1,
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
    </View>
  );
};
