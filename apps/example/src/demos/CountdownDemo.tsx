import { TimeFlow } from "number-flow-react-native/native";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const CountdownDemo = () => {
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(30);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggle = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s === 0) {
            setMinutes((m) => {
              if (m === 0) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                intervalRef.current = null;
                return 0;
              }
              return m - 1;
            });
            return 59;
          }
          return s - 1;
        });
      }, 1000);
    }
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setMinutes(5);
    setSeconds(30);
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Countdown</Text>
      <View style={styles.card}>
        <TimeFlow
          containerStyle={{ width: 200 }}
          minutes={minutes}
          seconds={seconds}
          style={{ fontFamily: "System", fontSize: 40, color: "#FF3B30" }}
          textAlign="center"
          trend={-1}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable style={[styles.button, { flex: 1 }]} onPress={toggle}>
          <Text style={styles.buttonText}>Start / Pause</Text>
        </Pressable>
        <Pressable style={[styles.button, { flex: 1 }]} onPress={reset}>
          <Text style={styles.buttonText}>Reset</Text>
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
