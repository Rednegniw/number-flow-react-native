import { NumberFlow } from "number-flow-react-native/native";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { pickPrefix, pickSuffix, randomValue } from "./utils";

export const DecimalDemo = () => {
  const [value, setValue] = useState(42.5);
  const [suffix, setSuffix] = useState("%");
  const [prefix, setPrefix] = useState("");

  const randomize = useCallback(() => {
    setValue(randomValue());
    setSuffix(pickSuffix());
    setPrefix(pickPrefix());
  }, []);

  return (
    <View style={{ gap: 8 }}>
      {/* Header */}
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#333" }}>
        Decimal
      </Text>
      <Text style={{ fontSize: 11, color: "#999" }}>
        {`prefix="${prefix}" suffix="${suffix}"`}
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
          format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          prefix={prefix}
          style={{ fontFamily: "System", fontSize: 34, color: "#007AFF" }}
          suffix={suffix}
          textAlign="center"
          value={value}
        />
      </View>

      {/* Action button */}
      <Pressable
        onPress={randomize}
        style={{
          backgroundColor: "#e8e8e8",
          borderRadius: 8,
          padding: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "500", color: "#333" }}>
          Randomize
        </Text>
      </Pressable>
    </View>
  );
};
