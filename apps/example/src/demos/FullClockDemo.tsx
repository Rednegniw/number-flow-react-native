import { TimeFlow } from "number-flow-react-native/native";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const FullClockDemo = () => {
  const [is24Hour, setIs24Hour] = useState(true);
  const [hours, setHours] = useState(() => new Date().getHours());
  const [minutes, setMinutes] = useState(() => new Date().getMinutes());
  const [seconds, setSeconds] = useState(() => new Date().getSeconds());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setHours(d.getHours());
      setMinutes(d.getMinutes());
      setSeconds(d.getSeconds());
    };
    update();
    intervalRef.current = setInterval(update, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Live Clock</Text>
      <View style={styles.card}>
        <TimeFlow
          containerStyle={{ width: 280 }}
          hours={hours}
          is24Hour={is24Hour}
          minutes={minutes}
          seconds={seconds}
          style={{ fontFamily: "System", fontSize: 30, color: "#007AFF" }}
          textAlign="center"
        />
      </View>
      <Pressable
        style={styles.button}
        onPress={() => setIs24Hour((v) => !v)}
      >
        <Text style={styles.buttonText}>Toggle 12h/24h</Text>
      </Pressable>
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
