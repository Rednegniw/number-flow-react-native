import { NumberFlow } from "number-flow-react-native/native";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

const VALUES = [0.001, 42, 1500, 123456, 9876543.21, 6.022e23, 1.6e-19];

export const ScientificDemo = () => {
  const [index, setIndex] = useState(0);
  const [engineering, setEngineering] = useState(false);

  const value = VALUES[index];
  const notation = engineering ? "engineering" : "scientific";

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % VALUES.length);
  }, []);

  const toggleNotation = useCallback(() => {
    setEngineering((e) => !e);
  }, []);

  return (
    <View style={{ gap: 8 }}>
      {/* Header */}
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#333" }}>
        Scientific Notation
      </Text>
      <Text style={{ fontSize: 11, color: "#999" }}>
        {`notation="${notation}" value=${value}`}
      </Text>

      {/* Number display */}
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
        <NumberFlow
          containerStyle={{ width: 280 }}
          format={{ notation, maximumFractionDigits: 3 }}
          style={{ fontFamily: "System", fontSize: 36, color: "#000" }}
          textAlign="center"
          value={value}
        />
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={next}
          style={{
            flex: 1,
            backgroundColor: "#e8e8e8",
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#333" }}>
            Next Value
          </Text>
        </Pressable>

        <Pressable
          onPress={toggleNotation}
          style={{
            flex: 1,
            backgroundColor: engineering ? "#d4e8ff" : "#e8e8e8",
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#333" }}>
            {engineering ? "Engineering" : "Scientific"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
