import { TimeFlow } from "number-flow-react-native/native";
import { useCallback, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

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
    <View style={{ gap: 8 }}>
      {/* Header */}
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#333" }}>
        Countdown
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
          containerStyle={{ width: 200 }}
          minutes={minutes}
          seconds={seconds}
          style={{ fontFamily: "System", fontSize: 40, color: "#FF3B30" }}
          textAlign="center"
          trend={-1}
        />
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={toggle}
          style={{
            flex: 1,
            backgroundColor: "#e8e8e8",
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#333" }}>
            Start / Pause
          </Text>
        </Pressable>

        <Pressable
          onPress={reset}
          style={{
            flex: 1,
            backgroundColor: "#e8e8e8",
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#333" }}>
            Reset
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
