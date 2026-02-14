import { TimeFlow } from "number-flow-react-native/native";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

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
    <View style={{ gap: 8 }}>
      {/* Header */}
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#333" }}>
        Live Clock
      </Text>

      {/* Time display */}
      <View
        style={{
          backgroundColor: "#f5f5f5",
          borderRadius: 12,
          padding: 20,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 70,
        }}
      >
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

      {/* Action button */}
      <Pressable
        onPress={() => setIs24Hour((v) => !v)}
        style={{
          backgroundColor: "#e8e8e8",
          borderRadius: 8,
          padding: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "500", color: "#333" }}>
          Toggle 12h/24h
        </Text>
      </Pressable>
    </View>
  );
};
