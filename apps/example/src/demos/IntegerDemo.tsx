import { NumberFlow } from "number-flow-react-native/native";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
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
    <View style={{ gap: 8 }}>
      {/* Header */}
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#333" }}>
        Integer
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
          format={{ useGrouping: true }}
          mask={false}
          prefix={prefix}
          style={{ fontFamily: "System", fontSize: 36, color: "#000" }}
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
