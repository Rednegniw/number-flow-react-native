import { Canvas } from "@shopify/react-native-skia";
import { NumberFlow } from "number-flow-react-native/native";
import { SkiaNumberFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { FONT_REGULAR, INTER_FONT_ASSET } from "../theme/fonts";

const FONT_SIZE = 28;
const CANVAS_WIDTH = 120;
const CANVAS_HEIGHT = 42;
const JUMPS = [100, 200, 500, 1000, 5000];

function useContinuousDemoState() {
  const [value, setValue] = useState(100);

  const jump = useCallback(() => {
    const delta = JUMPS[Math.floor(Math.random() * JUMPS.length)];
    setValue((v) => v + delta);
  }, []);

  const reset = useCallback(() => {
    setValue(100);
  }, []);

  return { value, jump, reset };
}

const ActionButtons = ({ onJump, onReset }: { onJump: () => void; onReset: () => void }) => (
  <View style={{ flexDirection: "row", gap: 8 }}>
    <Pressable
      onPress={onJump}
      style={{
        flex: 1,
        backgroundColor: colors.buttonBackground,
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>
        Jump +random
      </Text>
    </Pressable>

    <Pressable
      onPress={onReset}
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
);

export const ContinuousDemoNative = () => {
  const { value, jump, reset } = useContinuousDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* Description */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        Same value — left is default, right has continuous=true
      </Text>

      {/* Side-by-side comparison */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        {/* Default mode */}
        <View
          style={{
            flex: 1,
            backgroundColor: colors.demoBackground,
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 80,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: colors.textSecondary }}>
            Default
          </Text>
          <NumberFlow
            containerStyle={{ width: CANVAS_WIDTH }}
            format={{ useGrouping: true }}
            style={{ fontFamily: FONT_REGULAR, fontSize: FONT_SIZE, color: colors.text }}
            textAlign="center"
            trend={1}
            value={value}
          />
        </View>

        {/* Continuous mode */}
        <View
          style={{
            flex: 1,
            backgroundColor: colors.demoBackground,
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 80,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: colors.textSecondary }}>
            Continuous
          </Text>
          <NumberFlow
            containerStyle={{ width: CANVAS_WIDTH }}
            continuous
            format={{ useGrouping: true }}
            style={{ fontFamily: FONT_REGULAR, fontSize: FONT_SIZE, color: colors.text }}
            textAlign="center"
            trend={1}
            value={value}
          />
        </View>
      </View>

      {/* Action buttons */}
      <ActionButtons onJump={jump} onReset={reset} />
    </View>
  );
};

export const ContinuousDemoSkia = () => {
  const skiaFont = useSkiaFont(INTER_FONT_ASSET, FONT_SIZE);
  const { value, jump, reset } = useContinuousDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* Description */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        Same value — left is default, right has continuous=true
      </Text>

      {/* Side-by-side comparison */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        {/* Default mode */}
        <View
          style={{
            flex: 1,
            backgroundColor: colors.demoBackground,
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 80,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: colors.textSecondary }}>
            Default
          </Text>
          <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
            <SkiaNumberFlow
              color={colors.text}
              font={skiaFont}
              format={{ useGrouping: true }}
              textAlign="center"
              trend={1}
              value={value}
              width={CANVAS_WIDTH}
              y={FONT_SIZE}
            />
          </Canvas>
        </View>

        {/* Continuous mode */}
        <View
          style={{
            flex: 1,
            backgroundColor: colors.demoBackground,
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 80,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: colors.textSecondary }}>
            Continuous
          </Text>
          <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
            <SkiaNumberFlow
              color={colors.text}
              continuous
              font={skiaFont}
              format={{ useGrouping: true }}
              textAlign="center"
              trend={1}
              value={value}
              width={CANVAS_WIDTH}
              y={FONT_SIZE}
            />
          </Canvas>
        </View>
      </View>

      {/* Action buttons */}
      <ActionButtons onJump={jump} onReset={reset} />
    </View>
  );
};
