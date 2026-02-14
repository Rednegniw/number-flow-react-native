import { Canvas, useFont } from "@shopify/react-native-skia";
import { TimeFlow } from "number-flow-react-native/native";
import { SkiaTimeFlow } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { randomInt } from "./utils";

const SKIA_FONT_SIZE = 28;
const CANVAS_WIDTH = 280;
const CANVAS_HEIGHT = 40;

export const Clock24hDemo = () => {
  const skiaFont = useFont(
    require("../../assets/fonts/SpaceMono-Regular.ttf"),
    SKIA_FONT_SIZE
  );

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

  return (
    <View style={styles.section}>
      <Text style={styles.label}>24h Clock (Skia vs Native)</Text>

      <View style={styles.card}>
        <Text style={styles.rendererLabel}>Skia</Text>
        <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <SkiaTimeFlow
            color="#007AFF"
            font={skiaFont}
            hours={hours}
            minutes={minutes}
            textAlign="center"
            width={CANVAS_WIDTH}
            y={SKIA_FONT_SIZE}
          />
        </Canvas>
      </View>

      <View style={styles.card}>
        <Text style={styles.rendererLabel}>Native</Text>
        <TimeFlow
          containerStyle={{ width: CANVAS_WIDTH }}
          hours={hours}
          minutes={minutes}
          style={{
            fontFamily: "SpaceMono-Regular",
            fontSize: SKIA_FONT_SIZE,
            color: "#007AFF",
          }}
          textAlign="center"
        />
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable style={[styles.button, { flex: 1 }]} onPress={increment}>
          <Text style={styles.buttonText}>+1 Minute</Text>
        </Pressable>
        <Pressable style={[styles.button, { flex: 1 }]} onPress={randomize}>
          <Text style={styles.buttonText}>Random</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#333" },
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
