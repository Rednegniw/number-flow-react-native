import { TimeFlow } from "number-flow-react-native/native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const EdgeCaseDemo = () => {
  const [hours, setHours] = useState(9);
  const [minutes, setMinutes] = useState(59);
  const [is24Hour, setIs24Hour] = useState(true);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Edge Cases</Text>
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
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            style={[styles.button, { flex: 1 }]}
            onPress={() => {
              setIs24Hour(true);
              setHours(9);
              setMinutes(59);
              setTimeout(() => {
                setHours(10);
                setMinutes(0);
              }, 600);
            }}
          >
            <Text style={styles.buttonText}>9:59 → 10:00</Text>
          </Pressable>
          <Pressable
            style={[styles.button, { flex: 1 }]}
            onPress={() => {
              setIs24Hour(true);
              setHours(10);
              setMinutes(0);
              setTimeout(() => {
                setHours(9);
                setMinutes(59);
              }, 600);
            }}
          >
            <Text style={styles.buttonText}>10:00 → 9:59</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            style={[styles.button, { flex: 1 }]}
            onPress={() => {
              setIs24Hour(false);
              setHours(11);
              setMinutes(59);
              setTimeout(() => {
                setHours(12);
                setMinutes(0);
              }, 600);
            }}
          >
            <Text style={styles.buttonText}>11:59AM → 12:00PM</Text>
          </Pressable>
          <Pressable
            style={[styles.button, { flex: 1 }]}
            onPress={() => {
              setIs24Hour(true);
              setHours(23);
              setMinutes(59);
              setTimeout(() => {
                setHours(0);
                setMinutes(0);
              }, 600);
            }}
          >
            <Text style={styles.buttonText}>23:59 → 0:00</Text>
          </Pressable>
        </View>
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
