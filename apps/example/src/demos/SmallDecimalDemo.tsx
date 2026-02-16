import { Canvas, useFont } from "@shopify/react-native-skia";
import { NumberFlow } from "number-flow-react-native/native";
import { SkiaNumberFlow } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { FONT_REGULAR, INTER_FONT_ASSET } from "../theme/fonts";
import { pickSuffix } from "./utils";

const FONT_SIZE = 28;
const CANVAS_WIDTH = 250;
const CANVAS_HEIGHT = 42;

function useSmallDecimalDemoState() {
  const [value, setValue] = useState(0.042);
  const [suffix, setSuffix] = useState(" BAC");

  const randomize = useCallback(() => {
    setValue(Math.round(Math.random() * 1000) / 10000);
    setSuffix(pickSuffix());
  }, []);

  return { value, suffix, randomize };
}

export const SmallDecimalDemoNative = () => {
  const { value, suffix, randomize } = useSmallDecimalDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* State info */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        {`suffix="${suffix}"`}
      </Text>

      {/* Number display */}
      <View
        style={{
          backgroundColor: colors.demoBackground,
          borderRadius: 12,
          padding: 20,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 60,
        }}
      >
        <NumberFlow
          containerStyle={{ width: CANVAS_WIDTH }}
          format={{ minimumFractionDigits: 4, maximumFractionDigits: 4 }}
          style={{ fontFamily: FONT_REGULAR, fontSize: FONT_SIZE, color: colors.buttonText }}
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

export const SmallDecimalDemoSkia = () => {
  const skiaFont = useFont(INTER_FONT_ASSET, FONT_SIZE);
  const { value, suffix, randomize } = useSmallDecimalDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* State info */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        {`suffix="${suffix}"`}
      </Text>

      {/* Number display */}
      <View
        style={{
          backgroundColor: colors.demoBackground,
          borderRadius: 12,
          padding: 20,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 60,
        }}
      >
        <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <SkiaNumberFlow
            color={colors.buttonText}
            font={skiaFont}
            format={{ minimumFractionDigits: 4, maximumFractionDigits: 4 }}
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
