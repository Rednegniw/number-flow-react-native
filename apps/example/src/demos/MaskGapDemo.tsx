import { Canvas } from "@shopify/react-native-skia";
import { NumberFlow } from "number-flow-react-native/native";
import { SkiaNumberFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { DemoButton } from "../components/DemoButton";
import { colors } from "../theme/colors";
import { CANVAS_WIDTH, DEMO_FONT_FAMILY, DEMO_SKIA_FONT_ASSET } from "../theme/demoConstants";
import { randomInt } from "./utils";

const FONT_SIZE = 48;
const SKIA_CANVAS_HEIGHT = 64;

const BACKGROUNDS = [
  { label: "Light Gray", color: "#F5F5F5" },
  { label: "Medium Gray", color: "#D1D1D6" },
  { label: "Dark Gray", color: "#48484A" },
  { label: "Blue", color: "#0A84FF" },
  { label: "Black", color: "#000000" },
];

function useMaskGapDemoState() {
  const [value, setValue] = useState(42);

  const randomize = useCallback(() => {
    setValue(randomInt(0, 99999));
  }, []);

  return { value, randomize };
}

export const MaskGapDemoNative = () => {
  const { value, randomize } = useMaskGapDemoState();

  return (
    <View style={{ gap: 16 }}>
      {/* Info */}
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
        Check gradient mask rendering across different background colors.
      </Text>

      {/* Background swatches */}
      {BACKGROUNDS.map((bg) => {
        const textColor =
          bg.color === "#000000" || bg.color === "#48484A" ? "#FFFFFF" : colors.text;

        return (
          <View key={bg.color} style={{ gap: 4 }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              {bg.label} ({bg.color})
            </Text>
            <View
              style={{
                backgroundColor: bg.color,
                borderRadius: 12,
                padding: 20,
                alignItems: "center",
                justifyContent: "center",
                minHeight: 70,
              }}
            >
              <NumberFlow
                containerStyle={{ width: CANVAS_WIDTH }}
                style={{
                  fontFamily: DEMO_FONT_FAMILY,
                  fontSize: FONT_SIZE,
                  color: textColor,
                  textAlign: "center",
                }}
                value={value}
              />
            </View>
          </View>
        );
      })}

      {/* Action button */}
      <DemoButton label="Randomize" onPress={randomize} />
    </View>
  );
};

export const MaskGapDemoSkia = () => {
  const skiaFont = useSkiaFont(DEMO_SKIA_FONT_ASSET, FONT_SIZE);
  const { value, randomize } = useMaskGapDemoState();

  return (
    <View style={{ gap: 16 }}>
      {/* Info */}
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
        Check gradient mask rendering across different background colors.
      </Text>

      {/* Background swatches */}
      {BACKGROUNDS.map((bg) => {
        const textColor =
          bg.color === "#000000" || bg.color === "#48484A" ? "#FFFFFF" : colors.text;

        return (
          <View key={bg.color} style={{ gap: 4 }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              {bg.label} ({bg.color})
            </Text>
            <View
              style={{
                backgroundColor: bg.color,
                borderRadius: 12,
                padding: 20,
                alignItems: "center",
                justifyContent: "center",
                minHeight: 70,
              }}
            >
              <Canvas style={{ width: CANVAS_WIDTH, height: SKIA_CANVAS_HEIGHT }}>
                <SkiaNumberFlow
                  color={textColor}
                  font={skiaFont}
                  textAlign="center"
                  value={value}
                  width={CANVAS_WIDTH}
                  y={FONT_SIZE}
                />
              </Canvas>
            </View>
          </View>
        );
      })}

      {/* Action button */}
      <DemoButton label="Randomize" onPress={randomize} />
    </View>
  );
};
