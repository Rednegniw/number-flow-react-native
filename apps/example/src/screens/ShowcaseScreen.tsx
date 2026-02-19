import { Canvas } from "@shopify/react-native-skia";
import { SkiaNumberFlow, SkiaTimeFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar, useWindowDimensions } from "react-native";
import { Easing, runOnJS, useSharedValue, withTiming } from "react-native-reanimated";
import { INTER_SEMIBOLD_FONT_ASSET } from "../theme/fonts";

const NOTO_DEVANAGARI = require("../../assets/fonts/NotoSansDevanagari.ttf");

const BACKGROUND = "#0A0A0A";
const TEXT_COLOR = "#FFFFFF";
const FONT_SIZE = 48;
const FADE_DURATION = 400;
const HOLD_AFTER_LAST = 1000;

const TOTAL_SCENES = 5;

const easeInOut = Easing.inOut(Easing.ease);

export const ShowcaseScreen = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const interFont = useSkiaFont(INTER_SEMIBOLD_FONT_ASSET, FONT_SIZE);
  const devanagariFont = useSkiaFont(NOTO_DEVANAGARI, FONT_SIZE);

  const opacity = useSharedValue(0);
  const [sceneIndex, setSceneIndex] = useState(0);

  // Scene 1 - Basic numbers
  const [basicValue, setBasicValue] = useState(1234);

  // Scene 2 - Currency
  const [currencyValue, setCurrencyValue] = useState(42.5);

  // Scene 3 - Continuous
  const [continuousValue, setContinuousValue] = useState(100);

  // Scene 4 - TimeFlow
  const [hours, setHours] = useState(() => new Date().getHours());
  const [minutes, setMinutes] = useState(() => new Date().getMinutes());
  const [seconds, setSeconds] = useState(() => new Date().getSeconds());

  // Scene 5 - Devanagari
  const [devanagariValue, setDevanagariValue] = useState(9876.54);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  const advanceScene = useCallback(() => {
    setSceneIndex((prev) => (prev + 1) % TOTAL_SCENES);
  }, []);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    const intervals = intervalsRef.current;

    // Clear previous timeouts/intervals
    timeouts.forEach(clearTimeout);
    intervals.forEach(clearInterval);
    timeouts.length = 0;
    intervals.length = 0;

    const schedule = (fn: () => void, delay: number) => {
      timeouts.push(setTimeout(fn, delay));
    };

    // Reset values for current scene
    switch (sceneIndex) {
      case 0:
        setBasicValue(1234);
        break;
      case 1:
        setCurrencyValue(42.5);
        break;
      case 2:
        setContinuousValue(100);
        break;
      case 3: {
        const now = new Date();
        setHours(now.getHours());
        setMinutes(now.getMinutes());
        setSeconds(now.getSeconds());
        break;
      }
      case 4:
        setDevanagariValue(9876.54);
        break;
    }

    // Fade in
    opacity.value = withTiming(1, { duration: FADE_DURATION, easing: easeInOut });

    let cumulative = FADE_DURATION;

    switch (sceneIndex) {
      case 0: {
        // Basic Numbers
        cumulative += 1500;
        schedule(() => setBasicValue(56789), cumulative);
        cumulative += 2000;
        schedule(() => setBasicValue(9012345), cumulative);
        cumulative += 2000;
        break;
      }
      case 1: {
        // Currency
        cumulative += 1500;
        schedule(() => setCurrencyValue(1234.56), cumulative);
        cumulative += 2000;
        schedule(() => setCurrencyValue(9876.54), cumulative);
        cumulative += 2000;
        break;
      }
      case 2: {
        // Continuous
        cumulative += 1000;
        schedule(() => setContinuousValue(2459), cumulative);
        cumulative += 1200;
        schedule(() => setContinuousValue(7823), cumulative);
        cumulative += 1200;
        schedule(() => setContinuousValue(14591), cumulative);
        cumulative += 1200;
        schedule(() => setContinuousValue(28437), cumulative);
        cumulative += 1400;
        break;
      }
      case 3: {
        // TimeFlow - tick every 1s
        const interval = setInterval(() => {
          const now = new Date();
          setHours(now.getHours());
          setMinutes(now.getMinutes());
          setSeconds(now.getSeconds());
        }, 1000);
        intervals.push(interval);
        cumulative += 5500;
        break;
      }
      case 4: {
        // Devanagari
        cumulative += 1500;
        schedule(() => setDevanagariValue(1234.56), cumulative);
        cumulative += 2000;
        schedule(() => setDevanagariValue(42195), cumulative);
        cumulative += 2000;
        break;
      }
    }

    // Fade out and advance
    schedule(() => {
      opacity.value = withTiming(0, { duration: FADE_DURATION, easing: easeInOut }, () => {
        runOnJS(advanceScene)();
      });
    }, cumulative + HOLD_AFTER_LAST);

    return () => {
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      timeouts.length = 0;
      intervals.length = 0;
    };
  }, [sceneIndex, opacity, advanceScene]);

  const yPosition = screenHeight / 2;

  return (
    <>
      <StatusBar hidden />
      <Canvas style={{ flex: 1, backgroundColor: BACKGROUND }}>
        {/* Scene 1 - Basic Numbers */}
        {sceneIndex === 0 && (
          <SkiaNumberFlow
            color={TEXT_COLOR}
            font={interFont}
            format={{ useGrouping: true }}
            opacity={opacity}
            textAlign="center"
            value={basicValue}
            width={screenWidth}
            y={yPosition}
          />
        )}

        {/* Scene 2 - Currency */}
        {sceneIndex === 1 && (
          <SkiaNumberFlow
            color={TEXT_COLOR}
            font={interFont}
            format={{ style: "currency", currency: "USD", minimumFractionDigits: 2 }}
            opacity={opacity}
            textAlign="center"
            value={currencyValue}
            width={screenWidth}
            y={yPosition}
          />
        )}

        {/* Scene 3 - Continuous */}
        {sceneIndex === 2 && (
          <SkiaNumberFlow
            color={TEXT_COLOR}
            continuous
            font={interFont}
            format={{ useGrouping: true }}
            opacity={opacity}
            textAlign="center"
            trend={1}
            value={continuousValue}
            width={screenWidth}
            y={yPosition}
          />
        )}

        {/* Scene 4 - TimeFlow */}
        {sceneIndex === 3 && (
          <SkiaTimeFlow
            color={TEXT_COLOR}
            font={interFont}
            hours={hours}
            is24Hour
            minutes={minutes}
            opacity={opacity}
            seconds={seconds}
            textAlign="center"
            width={screenWidth}
            y={yPosition}
          />
        )}

        {/* Scene 5 - Devanagari */}
        {sceneIndex === 4 && (
          <SkiaNumberFlow
            color={TEXT_COLOR}
            font={devanagariFont}
            format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
            locales="ne-NP"
            opacity={opacity}
            textAlign="center"
            value={devanagariValue}
            width={screenWidth}
            y={yPosition}
          />
        )}
      </Canvas>
    </>
  );
};
