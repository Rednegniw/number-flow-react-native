import { Canvas, useFont } from "@shopify/react-native-skia";
import { NumberFlow } from "number-flow-react-native/native";
import { SkiaNumberFlow } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { pickPrefix, pickSuffix, randomValue } from "./utils";

const SKIA_FONT_SIZE = 28;
const CANVAS_WIDTH = 280;
const CANVAS_HEIGHT = 40;

export const ComparisonDemo = () => {
  const skiaFont = useFont(
    require("../../assets/fonts/SpaceMono-Regular.ttf"),
    SKIA_FONT_SIZE
  );

  const [value, setValue] = useState(0.042);
  const [suffix, setSuffix] = useState("%");
  const [prefix, setPrefix] = useState("");

  const randomize = useCallback(() => {
    setValue(randomValue());
    setSuffix(pickSuffix());
    setPrefix(pickPrefix());
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Skia vs Native Comparison</Text>
      <Text style={styles.meta}>{`prefix="${prefix}" suffix="${suffix}"`}</Text>

      <View style={styles.card}>
        <Text style={styles.rendererLabel}>Skia</Text>
        <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <SkiaNumberFlow
            color="#007AFF"
            font={skiaFont}
            format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
            prefix={prefix}
            suffix={suffix}
            textAlign="center"
            value={value}
            width={CANVAS_WIDTH}
            y={SKIA_FONT_SIZE}
          />
        </Canvas>
      </View>

      <View style={styles.card}>
        <Text style={styles.rendererLabel}>Native</Text>
        <NumberFlow
          containerStyle={{ width: CANVAS_WIDTH }}
          format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          prefix={prefix}
          style={{
            fontFamily: "SpaceMono-Regular",
            fontSize: SKIA_FONT_SIZE,
            color: "#007AFF",
          }}
          suffix={suffix}
          textAlign="center"
          value={value}
        />
      </View>

      <Pressable style={styles.button} onPress={randomize}>
        <Text style={styles.buttonText}>Randomize</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#333" },
  meta: { fontSize: 11, color: "#999" },
  rendererLabel: { fontSize: 11, color: "#999", marginBottom: 4 },
  card: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  button: {
    backgroundColor: "#e8e8e8",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  buttonText: { fontSize: 14, fontWeight: "500", color: "#333" },
});
