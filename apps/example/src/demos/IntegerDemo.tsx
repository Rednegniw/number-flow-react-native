import { NumberFlow } from "number-flow-react-native/native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { pick, pickSuffix, randomInt } from "./utils";

const PREFIXES = ["", "$", "~", "+", "-"];

export const IntegerDemo = () => {
  const [value, setValue] = useState(314159);
  const [suffix, setSuffix] = useState("");
  const [prefix, setPrefix] = useState("$");

  const randomize = useCallback(() => {
    setValue(randomInt(0, 10 ** randomInt(1, 7) - 1));
    setSuffix(pickSuffix());
    setPrefix(pick(PREFIXES));
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Integer</Text>
      <Text style={styles.meta}>{`prefix="${prefix}" suffix="${suffix}"`}</Text>
      <View style={styles.card}>
        <NumberFlow
          containerStyle={{ width: 280 }}
          format={{ useGrouping: true }}
          prefix={prefix}
          style={{ fontFamily: "System", fontSize: 36, color: "#000" }}
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
    minHeight: 70,
  },
  button: {
    backgroundColor: "#e8e8e8",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  buttonText: { fontSize: 14, fontWeight: "500", color: "#333" },
});
