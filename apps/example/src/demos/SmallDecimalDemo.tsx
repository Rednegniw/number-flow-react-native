import { NumberFlow } from "number-flow-react-native/native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { pickSuffix } from "./utils";

export const SmallDecimalDemo = () => {
  const [value, setValue] = useState(0.042);
  const [suffix, setSuffix] = useState(" BAC");

  const randomize = useCallback(() => {
    setValue(Math.round(Math.random() * 1000) / 10000);
    setSuffix(pickSuffix());
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Small Decimal</Text>
      <Text style={styles.meta}>{`suffix="${suffix}"`}</Text>
      <View style={styles.card}>
        <NumberFlow
          containerStyle={{ width: 250 }}
          format={{ minimumFractionDigits: 4, maximumFractionDigits: 4 }}
          style={{ fontFamily: "System", fontSize: 28, color: "#333" }}
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
  card: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
  },
  button: {
    backgroundColor: "#e8e8e8",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  buttonText: { fontSize: 14, fontWeight: "500", color: "#333" },
});
