import { TimeFlow } from "number-flow-react-native/native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const Clock12hDemo = () => {
  const [hours, setHours] = useState(14);
  const [minutes, setMinutes] = useState(30);
  const [is24Hour, setIs24Hour] = useState(false);

  const increment = useCallback(() => {
    setMinutes((prev) => {
      if (prev === 59) {
        setHours((h) => (h + 1) % 24);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>12h / 24h Toggle</Text>
      <View style={styles.card}>
        <TimeFlow
          containerStyle={{ width: 280 }}
          hours={hours}
          is24Hour={is24Hour}
          minutes={minutes}
          padHours={false}
          style={{ fontFamily: "System", fontSize: 34, color: "#007AFF" }}
          textAlign="center"
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable style={[styles.button, { flex: 1 }]} onPress={increment}>
          <Text style={styles.buttonText}>+1 Minute</Text>
        </Pressable>
        <Pressable
          style={[styles.button, { flex: 1 }]}
          onPress={() => setIs24Hour((v) => !v)}
        >
          <Text style={styles.buttonText}>Toggle 12h/24h</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#333" },
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
