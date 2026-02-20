import { Canvas } from "@shopify/react-native-skia";
import { NumberFlow } from "number-flow-react-native/native";
import { SkiaNumberFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { DemoButton } from "../components/DemoButton";
import { colors } from "../theme/colors";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEMO_FONT_FAMILY,
  DEMO_FONT_SIZE,
  DEMO_SKIA_FONT_ASSET,
  DEMO_TEXT_COLOR,
} from "../theme/demoConstants";
import { pick, pickPrefix, pickSuffix, randomInt, randomValue } from "./utils";

type NumberMode = "integer" | "decimal" | "high-precision";

const MODES: { key: NumberMode; label: string }[] = [
  { key: "integer", label: "Integer" },
  { key: "decimal", label: "Decimal" },
  { key: "high-precision", label: "High Precision" },
];

const INTEGER_PREFIXES = ["", "$", "~", "+", "-"];

function getFormatOptions(mode: NumberMode): Intl.NumberFormatOptions {
  switch (mode) {
    case "integer":
      return { useGrouping: true };
    case "decimal":
      return { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    case "high-precision":
      return { minimumFractionDigits: 4, maximumFractionDigits: 4 };
  }
}

function getInitialState(mode: NumberMode) {
  switch (mode) {
    case "integer":
      return { value: 314159, prefix: "$", suffix: "" };
    case "decimal":
      return { value: 42.5, prefix: "", suffix: "%" };
    case "high-precision":
      return { value: 0.042, prefix: "", suffix: " BAC" };
  }
}

function randomizeForMode(mode: NumberMode) {
  switch (mode) {
    case "integer":
      return {
        value: randomInt(0, 10 ** randomInt(1, 7) - 1),
        prefix: pick(INTEGER_PREFIXES),
        suffix: pickSuffix(),
      };
    case "decimal":
      return {
        value: randomValue(),
        prefix: pickPrefix(),
        suffix: pickSuffix(),
      };
    case "high-precision":
      return {
        value: Math.round(Math.random() * 1000) / 10000,
        prefix: "",
        suffix: pickSuffix(),
      };
  }
}

function useNumbersDemoState() {
  const [mode, setMode] = useState<NumberMode>("integer");
  const [value, setValue] = useState(314159);
  const [prefix, setPrefix] = useState("$");
  const [suffix, setSuffix] = useState("");

  const switchMode = useCallback((newMode: NumberMode) => {
    setMode(newMode);
    const initial = getInitialState(newMode);
    setValue(initial.value);
    setPrefix(initial.prefix);
    setSuffix(initial.suffix);
  }, []);

  const randomize = useCallback(() => {
    setMode((currentMode) => {
      const result = randomizeForMode(currentMode);
      setValue(result.value);
      setPrefix(result.prefix);
      setSuffix(result.suffix);
      return currentMode;
    });
  }, []);

  const format = getFormatOptions(mode);

  return { mode, value, prefix, suffix, format, switchMode, randomize };
}

const ModeChips = ({
  selected,
  onSelect,
}: {
  selected: NumberMode;
  onSelect: (mode: NumberMode) => void;
}) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
    {MODES.map((m) => {
      const isSelected = m.key === selected;
      return (
        <Pressable
          key={m.key}
          onPress={() => onSelect(m.key)}
          style={{
            backgroundColor: isSelected ? colors.text : colors.buttonBackground,
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: isSelected ? "#fff" : colors.buttonText,
            }}
          >
            {m.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

export const NumbersDemoNative = () => {
  const { mode, value, prefix, suffix, format, switchMode, randomize } = useNumbersDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* State info */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        {`prefix="${prefix}" suffix="${suffix}"`}
      </Text>

      {/* Mode chips */}
      <ModeChips selected={mode} onSelect={switchMode} />

      {/* Number display */}
      <View
        style={{
          backgroundColor: colors.demoBackground,
          borderRadius: 12,
          padding: 20,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 70,
        }}
      >
        <NumberFlow
          containerStyle={{ width: CANVAS_WIDTH }}
          format={format}
          prefix={prefix}
          style={{
            fontFamily: DEMO_FONT_FAMILY,
            fontSize: DEMO_FONT_SIZE,
            color: DEMO_TEXT_COLOR,
            textAlign: "center",
          }}
          suffix={suffix}
          value={value}
        />
      </View>

      {/* Action button */}
      <DemoButton label="Randomize" onPress={randomize} />
    </View>
  );
};

export const NumbersDemoSkia = () => {
  const skiaFont = useSkiaFont(DEMO_SKIA_FONT_ASSET, DEMO_FONT_SIZE);
  const { mode, value, prefix, suffix, format, switchMode, randomize } = useNumbersDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* State info */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        {`prefix="${prefix}" suffix="${suffix}"`}
      </Text>

      {/* Mode chips */}
      <ModeChips selected={mode} onSelect={switchMode} />

      {/* Number display */}
      <View
        style={{
          backgroundColor: colors.demoBackground,
          borderRadius: 12,
          padding: 20,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 70,
        }}
      >
        <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <SkiaNumberFlow
            color={DEMO_TEXT_COLOR}
            font={skiaFont}
            format={format}
            prefix={prefix}
            suffix={suffix}
            textAlign="center"
            value={value}
            width={CANVAS_WIDTH}
            y={DEMO_FONT_SIZE}
          />
        </Canvas>
      </View>

      {/* Action button */}
      <DemoButton label="Randomize" onPress={randomize} />
    </View>
  );
};
