import { Canvas } from "@shopify/react-native-skia";
import { TimeFlow } from "number-flow-react-native/native";
import { SkiaTimeFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useState } from "react";
import { View } from "react-native";
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

interface TransitionTest {
  label: string;
  use24h: boolean;
  fromHours: number;
  fromMinutes: number;
  toHours: number;
  toMinutes: number;
}

const TRANSITIONS: TransitionTest[] = [
  { label: "9:59 → 10:00", use24h: true, fromHours: 9, fromMinutes: 59, toHours: 10, toMinutes: 0 },
  { label: "10:00 → 9:59", use24h: true, fromHours: 10, fromMinutes: 0, toHours: 9, toMinutes: 59 },
  {
    label: "11:59AM → 12:00PM",
    use24h: false,
    fromHours: 11,
    fromMinutes: 59,
    toHours: 12,
    toMinutes: 0,
  },
  { label: "23:59 → 0:00", use24h: true, fromHours: 23, fromMinutes: 59, toHours: 0, toMinutes: 0 },
];

function useEdgeCaseDemoState() {
  const [hours, setHours] = useState(9);
  const [minutes, setMinutes] = useState(59);
  const [is24Hour, setIs24Hour] = useState(true);

  const runTransition = (t: TransitionTest) => {
    setIs24Hour(t.use24h);
    setHours(t.fromHours);
    setMinutes(t.fromMinutes);
    setTimeout(() => {
      setHours(t.toHours);
      setMinutes(t.toMinutes);
    }, 600);
  };

  return { hours, minutes, is24Hour, runTransition };
}

const TransitionButtons = ({ onRun }: { onRun: (t: TransitionTest) => void }) => (
  <View style={{ gap: 8 }}>
    <View style={{ flexDirection: "row", gap: 8 }}>
      {TRANSITIONS.slice(0, 2).map((t) => (
        <DemoButton key={t.label} label={t.label} onPress={() => onRun(t)} style={{ flex: 1 }} />
      ))}
    </View>

    <View style={{ flexDirection: "row", gap: 8 }}>
      {TRANSITIONS.slice(2).map((t) => (
        <DemoButton key={t.label} label={t.label} onPress={() => onRun(t)} style={{ flex: 1 }} />
      ))}
    </View>
  </View>
);

export const EdgeCaseDemoNative = () => {
  const { hours, minutes, is24Hour, runTransition } = useEdgeCaseDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* Time display */}
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
        <TimeFlow
          containerStyle={{ width: CANVAS_WIDTH }}
          hours={hours}
          is24Hour={is24Hour}
          minutes={minutes}
          padHours={false}
          style={{ fontFamily: DEMO_FONT_FAMILY, fontSize: DEMO_FONT_SIZE, color: DEMO_TEXT_COLOR }}
          textAlign="center"
        />
      </View>

      {/* Transition test buttons */}
      <TransitionButtons onRun={runTransition} />
    </View>
  );
};

export const EdgeCaseDemoSkia = () => {
  const skiaFont = useSkiaFont(DEMO_SKIA_FONT_ASSET, DEMO_FONT_SIZE);
  const { hours, minutes, is24Hour, runTransition } = useEdgeCaseDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* Time display */}
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
          <SkiaTimeFlow
            color={DEMO_TEXT_COLOR}
            font={skiaFont}
            hours={hours}
            is24Hour={is24Hour}
            minutes={minutes}
            padHours={false}
            textAlign="center"
            width={CANVAS_WIDTH}
            y={DEMO_FONT_SIZE}
          />
        </Canvas>
      </View>

      {/* Transition test buttons */}
      <TransitionButtons onRun={runTransition} />
    </View>
  );
};
