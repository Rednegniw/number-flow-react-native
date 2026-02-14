import { NumberFlow } from "number-flow-react-native/native";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

const JUMPS = [100, 200, 500, 1000, 5000];

export const ContinuousDemo = () => {
  const [value, setValue] = useState(100);

  const jump = useCallback(() => {
    const delta = JUMPS[Math.floor(Math.random() * JUMPS.length)];
    setValue((v) => v + delta);
  }, []);

  const reset = useCallback(() => {
    setValue(100);
  }, []);

  return (
    <View style={{ gap: 8 }}>
      {/* Header */}
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#333" }}>
        Continuous Mode
      </Text>
      <Text style={{ fontSize: 11, color: "#999" }}>
        Same value — left is default, right has continuous=true
      </Text>

      {/* Side-by-side comparison */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        {/* Default mode */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#f5f5f5",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 80,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: "#999" }}>
            Default
          </Text>
          <NumberFlow
            containerStyle={{ width: 120 }}
            format={{ useGrouping: true }}
            style={{ fontFamily: "System", fontSize: 28, color: "#000" }}
            textAlign="center"
            trend={1}
            value={value}
          />
        </View>

        {/* Continuous mode */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#f5f5f5",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 80,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: "#999" }}>
            Continuous
          </Text>
          <NumberFlow
            containerStyle={{ width: 120 }}
            continuous
            format={{ useGrouping: true }}
            style={{ fontFamily: "System", fontSize: 28, color: "#000" }}
            textAlign="center"
            trend={1}
            value={value}
          />
        </View>
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={jump}
          style={{
            flex: 1,
            backgroundColor: "#e8e8e8",
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#333" }}>
            Jump +random
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
