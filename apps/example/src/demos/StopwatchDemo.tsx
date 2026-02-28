import { Canvas } from "@shopify/react-native-skia";
import { TimeFlow } from "number-flow-react-native/native";
import { SkiaTimeFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Easing } from "react-native-reanimated";
import { RipplePressable } from "../components/RipplePressable";
import { FONT_MEDIUM, INTER_MEDIUM_FONT_ASSET } from "../theme/fonts";

// Apple Stopwatch colors
const STOPWATCH_BG = "#000000";
const STOPWATCH_TEXT = "#FFFFFF";
const GREEN = "#30D158";
const GREEN_DIM = "rgba(48, 209, 88, 0.3)";
const RED = "#FF3B30";
const RED_DIM = "rgba(255, 59, 48, 0.3)";
const GRAY = "#333333";
const GRAY_DIM = "#1C1C1E";
const DISABLED_TEXT = "#555555";
const DOT_ACTIVE = "#FFFFFF";
const DOT_INACTIVE = "rgba(255, 255, 255, 0.3)";

const FONT_SIZE = 56;
const BUTTON_SIZE = 80;
const BUTTON_INNER = 72;

const SPIN_TIMING = { duration: 200, easing: Easing.out(Easing.cubic) };

const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 80;

type StopwatchPhase = "initial" | "running" | "paused";

/**
 * Stopwatch timer with separate state per display segment.
 * Only the changed segment triggers a re-render; minutes and seconds
 * stay idle while centiseconds tick, eliminating cascade re-renders.
 */
function useStopwatchState() {
  const [mm, setMm] = useState(0);
  const [ss, setSs] = useState(0);
  const [cc, setCc] = useState(0);
  const [phase, setPhase] = useState<StopwatchPhase>("initial");

  const startTimeRef = useRef(0);
  const accumulatedRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const prevMmRef = useRef(0);
  const prevSsRef = useRef(0);
  const prevCcRef = useRef(0);

  const tick = useCallback(() => {
    const totalMs = accumulatedRef.current + (Date.now() - startTimeRef.current);
    const newMm = Math.floor(totalMs / 60000);
    const newSs = Math.floor((totalMs % 60000) / 1000);
    const newCc = Math.floor((totalMs % 1000) / 10);

    if (newCc !== prevCcRef.current) {
      prevCcRef.current = newCc;
      setCc(newCc);
    }

    if (newSs !== prevSsRef.current) {
      prevSsRef.current = newSs;
      setSs(newSs);
    }

    if (newMm !== prevMmRef.current) {
      prevMmRef.current = newMm;
      setMm(newMm);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    startTimeRef.current = Date.now();
    setPhase("running");
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    accumulatedRef.current += Date.now() - startTimeRef.current;
    setPhase("paused");
  }, []);

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    accumulatedRef.current = 0;
    prevMmRef.current = 0;
    prevSsRef.current = 0;
    prevCcRef.current = 0;
    setMm(0);
    setSs(0);
    setCc(0);
    setPhase("initial");
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { mm, ss, cc, phase, start, stop, reset };
}

const StopwatchButton = ({
  label,
  textColor,
  fillColor,
  borderColor,
  onPress,
  disabled,
}: {
  label: string;
  textColor: string;
  fillColor: string;
  borderColor: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <RipplePressable
    onPress={disabled ? undefined : onPress}
    rippleColor="rgba(255, 255, 255, 0.15)"
    style={{
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      borderRadius: BUTTON_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor,
    }}
  >
    <View
      style={{
        width: BUTTON_INNER,
        height: BUTTON_INNER,
        borderRadius: BUTTON_INNER / 2,
        backgroundColor: fillColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: "500", color: textColor }}>{label}</Text>
    </View>
  </RipplePressable>
);

const PaginationDots = () => (
  <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginVertical: 20 }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DOT_ACTIVE }} />
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DOT_INACTIVE }} />
  </View>
);

function getButtons(
  phase: StopwatchPhase,
  actions: { start: () => void; stop: () => void; reset: () => void },
) {
  switch (phase) {
    case "initial":
      return {
        left: {
          label: "Lap",
          textColor: DISABLED_TEXT,
          fillColor: GRAY_DIM,
          borderColor: GRAY,
          onPress: () => {},
          disabled: true,
        },
        right: {
          label: "Start",
          textColor: GREEN,
          fillColor: GREEN_DIM,
          borderColor: GREEN_DIM,
          onPress: actions.start,
        },
      };
    case "running":
      return {
        left: {
          label: "Lap",
          textColor: STOPWATCH_TEXT,
          fillColor: GRAY,
          borderColor: GRAY,
          onPress: () => {},
        },
        right: {
          label: "Stop",
          textColor: RED,
          fillColor: RED_DIM,
          borderColor: RED_DIM,
          onPress: actions.stop,
        },
      };
    case "paused":
      return {
        left: {
          label: "Reset",
          textColor: STOPWATCH_TEXT,
          fillColor: GRAY,
          borderColor: GRAY,
          onPress: actions.reset,
        },
        right: {
          label: "Start",
          textColor: GREEN,
          fillColor: GREEN_DIM,
          borderColor: GREEN_DIM,
          onPress: actions.start,
        },
      };
  }
}

const StopwatchControls = ({
  phase,
  start,
  stop,
  reset,
}: {
  phase: StopwatchPhase;
  start: () => void;
  stop: () => void;
  reset: () => void;
}) => {
  const { left, right } = getButtons(phase, { start, stop, reset });

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20 }}>
      <StopwatchButton
        borderColor={left.borderColor}
        disabled={left.disabled}
        fillColor={left.fillColor}
        label={left.label}
        onPress={left.onPress}
        textColor={left.textColor}
      />
      <StopwatchButton
        borderColor={right.borderColor}
        fillColor={right.fillColor}
        label={right.label}
        onPress={right.onPress}
        textColor={right.textColor}
      />
    </View>
  );
};

export const StopwatchDemoNative = () => {
  const { mm, ss, cc, phase, start, stop, reset } = useStopwatchState();

  return (
    <View style={{ backgroundColor: STOPWATCH_BG, borderRadius: 24, paddingVertical: 40 }}>
      {/* Time display */}
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <TimeFlow
          centiseconds={cc}
          minutes={mm}
          seconds={ss}
          spinTiming={SPIN_TIMING}
          style={{
            fontFamily: FONT_MEDIUM,
            fontSize: FONT_SIZE,
            color: STOPWATCH_TEXT,
            fontVariant: ["tabular-nums"],
            textAlign: "center",
          }}
          trend={1}
        />
      </View>

      {/* Pagination dots */}
      <PaginationDots />

      {/* Buttons */}
      <StopwatchControls phase={phase} reset={reset} start={start} stop={stop} />
    </View>
  );
};

export const StopwatchDemoSkia = () => {
  const skiaFont = useSkiaFont(INTER_MEDIUM_FONT_ASSET, FONT_SIZE);
  const { mm, ss, cc, phase, start, stop, reset } = useStopwatchState();

  return (
    <View style={{ backgroundColor: STOPWATCH_BG, borderRadius: 24, paddingVertical: 40 }}>
      {/* Time display */}
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <SkiaTimeFlow
            centiseconds={cc}
            color={STOPWATCH_TEXT}
            font={skiaFont}
            minutes={mm}
            seconds={ss}
            spinTiming={SPIN_TIMING}
            tabularNums
            textAlign="center"
            trend={1}
            width={CANVAS_WIDTH}
            y={FONT_SIZE}
          />
        </Canvas>
      </View>

      {/* Pagination dots */}
      <PaginationDots />

      {/* Buttons */}
      <StopwatchControls phase={phase} reset={reset} start={start} stop={stop} />
    </View>
  );
};
