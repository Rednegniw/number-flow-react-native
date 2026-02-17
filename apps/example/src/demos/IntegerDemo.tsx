import { Canvas } from "@shopify/react-native-skia";
import { NumberFlow } from "number-flow-react-native/native";
import { SkiaNumberFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { FONT_REGULAR, INTER_FONT_ASSET } from "../theme/fonts";
import { pick, pickSuffix, randomInt } from "./utils";

const FONT_SIZE = 36;
const CANVAS_WIDTH = 280;
const CANVAS_HEIGHT = 52;
const PREFIXES = ["", "$", "~", "+", "-"];

function useIntegerDemoState() {
  const [value, setValue] = useState(314159);
  const [suffix, setSuffix] = useState("");
  const [prefix, setPrefix] = useState("$");

  const randomize = useCallback(() => {
    setValue(randomInt(0, 10 ** randomInt(1, 7) - 1));
    setSuffix(pickSuffix());
    setPrefix(pick(PREFIXES));
  }, []);

  return { value, suffix, prefix, randomize };
}

export const IntegerDemoNative = () => {
  const { value, suffix, prefix, randomize } = useIntegerDemoState();

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
          format={{ useGrouping: true }}
          mask={false}
          prefix={prefix}
          style={{ fontFamily: FONT_REGULAR, fontSize: FONT_SIZE, color: colors.text }}
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
        <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>Randomize</Text>
      </Pressable>
    </View>
  );
};

export const IntegerDemoSkia = () => {
  const skiaFont = useSkiaFont(INTER_FONT_ASSET, FONT_SIZE);
  const { value, suffix, prefix, randomize } = useIntegerDemoState();

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
            color={colors.text}
            font={skiaFont}
            format={{ useGrouping: true }}
            mask={false}
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
        <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>Randomize</Text>
      </Pressable>
    </View>
  );
};
