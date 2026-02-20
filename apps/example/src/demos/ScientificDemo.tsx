import { Canvas } from "@shopify/react-native-skia";
import { NumberFlow } from "number-flow-react-native/native";
import { SkiaNumberFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
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

const VALUES = [0.001, 42, 1500, 123456, 9876543.21, 6.022e23, 1.6e-19];

function useScientificDemoState() {
  const [index, setIndex] = useState(0);
  const [engineering, setEngineering] = useState(false);

  const value = VALUES[index];
  const notation: "scientific" | "engineering" = engineering ? "engineering" : "scientific";

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % VALUES.length);
  }, []);

  const toggleNotation = useCallback(() => {
    setEngineering((e) => !e);
  }, []);

  return { value, notation, engineering, next, toggleNotation };
}

const ActionButtons = ({
  engineering,
  onNext,
  onToggle,
}: {
  engineering: boolean;
  onNext: () => void;
  onToggle: () => void;
}) => (
  <View style={{ flexDirection: "row", gap: 8 }}>
    <DemoButton label="Next Value" onPress={onNext} style={{ flex: 1 }} />
    <DemoButton
      active={engineering}
      label={engineering ? "Engineering" : "Scientific"}
      onPress={onToggle}
      style={{ flex: 1 }}
    />
  </View>
);

export const ScientificDemoNative = () => {
  const { value, notation, engineering, next, toggleNotation } = useScientificDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* State info */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        {`notation="${notation}" value=${value}`}
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
          format={{ notation, maximumFractionDigits: 3 }}
          style={{
            fontFamily: DEMO_FONT_FAMILY,
            fontSize: DEMO_FONT_SIZE,
            color: DEMO_TEXT_COLOR,
            textAlign: "center",
          }}
          value={value}
        />
      </View>

      {/* Action buttons */}
      <ActionButtons engineering={engineering} onNext={next} onToggle={toggleNotation} />
    </View>
  );
};

export const ScientificDemoSkia = () => {
  const skiaFont = useSkiaFont(DEMO_SKIA_FONT_ASSET, DEMO_FONT_SIZE);
  const { value, notation, engineering, next, toggleNotation } = useScientificDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* State info */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        {`notation="${notation}" value=${value}`}
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
        <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <SkiaNumberFlow
            color={DEMO_TEXT_COLOR}
            font={skiaFont}
            format={{ notation, maximumFractionDigits: 3 }}
            textAlign="center"
            value={value}
            width={CANVAS_WIDTH}
            y={DEMO_FONT_SIZE}
          />
        </Canvas>
      </View>

      {/* Action buttons */}
      <ActionButtons engineering={engineering} onNext={next} onToggle={toggleNotation} />
    </View>
  );
};
