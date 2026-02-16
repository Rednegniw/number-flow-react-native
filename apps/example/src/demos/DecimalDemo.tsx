import { Canvas, useFont } from "@shopify/react-native-skia";
import { NumberFlow } from "number-flow-react-native/native";
import { SkiaNumberFlow } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { FONT_REGULAR, INTER_FONT_ASSET } from "../theme/fonts";
import { pickPrefix, pickSuffix, randomValue } from "./utils";

const FONT_SIZE = 34;
const CANVAS_WIDTH = 280;
const CANVAS_HEIGHT = 50;

function useDecimalDemoState() {
  const [value, setValue] = useState(42.5);
  const [suffix, setSuffix] = useState("%");
  const [prefix, setPrefix] = useState("");

  const randomize = useCallback(() => {
    setValue(randomValue());
    setSuffix(pickSuffix());
    setPrefix(pickPrefix());
  }, []);

  return { value, suffix, prefix, randomize };
}

export const DecimalDemoNative = () => {
  const { value, suffix, prefix, randomize } = useDecimalDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* State info */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        {`prefix="${prefix}" suffix="${suffix}"`}
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
          format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          prefix={prefix}
          style={{ fontFamily: FONT_REGULAR, fontSize: FONT_SIZE, color: colors.accent }}
          suffix={suffix}
          textAlign="center"
          value={value}
        />
      </View>

      {/* Action button */}
      <Pressable
        onPress={randomize}
        style={{
          backgroundColor: colors.buttonBackground,
          borderRadius: 8,
          padding: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>
          Randomize
        </Text>
      </Pressable>
    </View>
  );
};

export const DecimalDemoSkia = () => {
  const skiaFont = useFont(INTER_FONT_ASSET, FONT_SIZE);
  const { value, suffix, prefix, randomize } = useDecimalDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* State info */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        {`prefix="${prefix}" suffix="${suffix}"`}
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
            color={colors.accent}
            font={skiaFont}
            format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
            prefix={prefix}
            suffix={suffix}
            textAlign="center"
            value={value}
            width={CANVAS_WIDTH}
            y={FONT_SIZE}
          />
        </Canvas>
      </View>

      {/* Action button */}
      <Pressable
        onPress={randomize}
        style={{
          backgroundColor: colors.buttonBackground,
          borderRadius: 8,
          padding: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>
          Randomize
        </Text>
      </Pressable>
    </View>
  );
};
