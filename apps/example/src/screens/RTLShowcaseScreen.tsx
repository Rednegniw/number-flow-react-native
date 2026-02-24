import { Canvas, Group, Paint, Text as SkiaText } from "@shopify/react-native-skia";
import { getFormatCharacters } from "number-flow-react-native/internal/core/intlHelpers";
import { computeKeyedLayout } from "number-flow-react-native/internal/core/layout";
import {
  detectNumberingSystem,
  getDigitStrings,
} from "number-flow-react-native/internal/core/numerals";
import { useNumberFormatting } from "number-flow-react-native/internal/core/useNumberFormatting";
import { useGlyphMetrics } from "number-flow-react-native/internal/skia/useGlyphMetrics";
import { SkiaNumberFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBar, useWindowDimensions, View } from "react-native";
import { cancelAnimation, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { INTER_SEMIBOLD_FONT_ASSET } from "../theme/fonts";

const NOTO_ARABIC = require("../../assets/fonts/NotoSansArabic.ttf");

const BACKGROUND = "#0A0A0A";
const NUMBER_FONT_SIZE = 56;
const LOCALE_LABEL_FONT_SIZE = 18;
const LABEL_FONT_SIZE = 14;
const PADDING_H = 24;

// Fallback currency symbols for Hermes (which may lack formatToParts)
const CURRENCY_SYMBOLS: Record<string, string> = {
  EGP: "ج.م.",
  ILS: "₪",
};

interface LocaleConfig {
  label: string;
  locale: string;
  currency: string;
  usesArabicFont: boolean;
}

const LOCALES: LocaleConfig[] = [
  { label: "Arabic - EGP", locale: "ar-EG", currency: "EGP", usesArabicFont: true },
  { label: "Hebrew - ILS", locale: "he-IL", currency: "ILS", usesArabicFont: false },
];

interface Step {
  localeIndex: number;
  negative: boolean;
}

const STEPS: Step[] = [
  { localeIndex: 0, negative: false },
  { localeIndex: 0, negative: true },
  { localeIndex: 1, negative: false },
  { localeIndex: 1, negative: true },
];

const STEP_DURATION = 4000;
const LOOP_PAUSE = 3000;
const SETTLE_DELAY = 1200;
const FADE_DURATION = 500;
const TRANSITION_FADE = 300;
const INITIAL_VALUE = 1000;

function randomValue(negative: boolean): number {
  const base = Math.floor(Math.random() * 9000) + 1000 + Math.random();
  const rounded = Math.round(base * 100) / 100;
  return negative ? -rounded : rounded;
}

export const RTLShowcaseScreen = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Fonts
  const arabicFont = useSkiaFont(NOTO_ARABIC, NUMBER_FONT_SIZE);
  const latinFont = useSkiaFont(INTER_SEMIBOLD_FONT_ASSET, NUMBER_FONT_SIZE);
  const localeLabelFont = useSkiaFont(INTER_SEMIBOLD_FONT_ASSET, LOCALE_LABEL_FONT_SIZE);
  const labelFont = useSkiaFont(INTER_SEMIBOLD_FONT_ASSET, LABEL_FONT_SIZE);

  // Auto-cycling state
  const [stepIndex, setStepIndex] = useState(0);
  const valuesRef = useRef<number[]>(STEPS.map((s) => randomValue(s.negative)));

  // Two-phase value: mount with INITIAL_VALUE, then set real value to trigger roll animation
  const [displayValue, setDisplayValue] = useState(INITIAL_VALUE);

  const step = STEPS[stepIndex];
  const current = LOCALES[step.localeIndex];
  const font = current.usesArabicFont ? arabicFont : latinFont;

  const format: Intl.NumberFormatOptions = useMemo(
    () => ({
      style: "currency" as const,
      currency: current.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    [current.currency],
  );

  // Replicate SkiaNumberFlow's internal pipeline to get exact CharLayout[]
  const formatChars = useMemo(
    () => getFormatCharacters(current.locale, format),
    [current.locale, format],
  );
  const numberingSystem = useMemo(
    () => detectNumberingSystem(current.locale, format),
    [current.locale, format],
  );
  const digitStringsArr = useMemo(() => getDigitStrings(numberingSystem), [numberingSystem]);
  const metrics = useGlyphMetrics(font, formatChars, digitStringsArr);

  const { parts: keyedParts, rawChars } = useNumberFormatting(
    displayValue,
    format,
    current.locale,
    "",
    "",
  );

  const contentWidth = screenWidth - PADDING_H * 2;

  const layout = useMemo(() => {
    if (!metrics || keyedParts.length === 0) return [];
    return computeKeyedLayout(keyedParts, metrics, contentWidth, "right", {
      localeDigitStrings: digitStringsArr,
      rawCharsWithBidi: rawChars,
      direction: "rtl",
    });
  }, [keyedParts, metrics, contentWidth, digitStringsArr, rawChars]);

  // Characters that should be highlighted (currency symbols + minus sign)
  const highlightChars = useMemo(() => {
    const chars = new Set<string>();

    const fmt = new Intl.NumberFormat(current.locale, format);
    if (typeof fmt.formatToParts === "function") {
      const parts = fmt.formatToParts(displayValue);
      for (const p of parts) {
        if (p.type === "currency" || p.type === "minusSign") {
          for (const ch of p.value) chars.add(ch);
        }
      }
    } else {
      // Hermes fallback: use known currency symbols + minus
      for (const ch of CURRENCY_SYMBOLS[current.currency] ?? "") chars.add(ch);
      chars.add("-");
      chars.add("\u2212");
    }

    return chars;
  }, [current.locale, current.currency, format, displayValue]);

  // Extract layout entries whose character is a currency or sign char
  const symbolEntries = useMemo(
    () => layout.filter((entry) => highlightChars.has(entry.char)),
    [layout, highlightChars],
  );

  // Controls whether SkiaNumberFlow is mounted (prevents wrong-font glyph flash)
  const [visible, setVisible] = useState(true);
  const prevLocaleRef = useRef(step.localeIndex);

  // Animation shared values
  const sceneOpacity = useSharedValue(1);
  const numberOpacity = useSharedValue(1);
  const symbolOverlayOpacity = useSharedValue(0);

  // When stepIndex changes and locale changed, unmount then remount after a frame
  useEffect(() => {
    const localeChanged = prevLocaleRef.current !== step.localeIndex;
    prevLocaleRef.current = step.localeIndex;

    if (localeChanged) {
      setVisible(false);
      setDisplayValue(INITIAL_VALUE);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
  }, [step.localeIndex]);

  // Set the real value shortly after mount/step change to trigger the roll animation
  useEffect(() => {
    if (!visible) return;

    setDisplayValue(INITIAL_VALUE);
    const id = requestAnimationFrame(() => {
      setDisplayValue(valuesRef.current[stepIndex]);
    });
    return () => cancelAnimationFrame(id);
  }, [stepIndex, visible]);

  useEffect(() => {
    if (!visible) return;

    cancelAnimation(sceneOpacity);
    cancelAnimation(numberOpacity);
    cancelAnimation(symbolOverlayOpacity);

    sceneOpacity.value = withTiming(1, { duration: TRANSITION_FADE });
    numberOpacity.value = 1;
    symbolOverlayOpacity.value = 0;

    // After the roll settles: fade number, show symbol overlay
    numberOpacity.value = withDelay(SETTLE_DELAY, withTiming(0.2, { duration: FADE_DURATION }));
    symbolOverlayOpacity.value = withDelay(
      SETTLE_DELAY,
      withTiming(1, { duration: FADE_DURATION }),
    );

    // Determine if the next step changes locale
    const nextIndex = (stepIndex + 1) % STEPS.length;
    const nextLocaleChanges = STEPS[nextIndex].localeIndex !== step.localeIndex;
    const fadeOutStart = STEP_DURATION - TRANSITION_FADE;

    // Fade out before locale change
    const fadeOutTimer = nextLocaleChanges
      ? setTimeout(() => {
          sceneOpacity.value = withTiming(0, { duration: TRANSITION_FADE });
        }, fadeOutStart)
      : undefined;

    // Advance to next step (extra delay for locale changes and loop restarts)
    const isLoopRestart = nextIndex === 0;
    let advanceDelay = STEP_DURATION;
    if (nextLocaleChanges) advanceDelay += TRANSITION_FADE;
    if (isLoopRestart) advanceDelay += LOOP_PAUSE;
    const advanceTimer = setTimeout(() => {
      setStepIndex((prev) => {
        const next = (prev + 1) % STEPS.length;
        valuesRef.current[next] = randomValue(STEPS[next].negative);
        return next;
      });
    }, advanceDelay);

    return () => {
      if (fadeOutTimer) clearTimeout(fadeOutTimer);
      clearTimeout(advanceTimer);
    };
  }, [stepIndex, visible, sceneOpacity, numberOpacity, symbolOverlayOpacity, step.localeIndex]);

  // Layout positions
  const centerY = screenHeight * 0.45;
  const localeLabelY = centerY - 60;
  const numberY = centerY + 20;

  // Locale label right-aligned: measure text width to position from right edge
  const localeLabelWidth = localeLabelFont ? localeLabelFont.measureText(current.label).width : 0;
  const localeLabelX = PADDING_H + contentWidth - localeLabelWidth;

  return (
    <View style={{ flex: 1, backgroundColor: BACKGROUND }}>
      <StatusBar hidden />

      <Canvas style={{ flex: 1 }}>
        <Group layer={<Paint opacity={sceneOpacity} />}>
          {/* Locale label (right-aligned, white) */}
          {localeLabelFont && (
            <SkiaText
              color="#ffffff"
              font={localeLabelFont}
              text={current.label}
              x={localeLabelX}
              y={localeLabelY}
            />
          )}

          {/* RTL number - fades to dim */}
          {font && visible && (
            <SkiaNumberFlow
              color="#ffffff"
              direction="rtl"
              font={font}
              format={format}
              locales={current.locale}
              opacity={numberOpacity}
              textAlign="right"
              value={displayValue}
              width={contentWidth}
              x={PADDING_H}
              y={numberY}
            />
          )}

          {/* Symbol overlay: exact same positions as SkiaNumberFlow's internal layout */}
          {font && visible && symbolEntries.length > 0 && (
            <Group layer={<Paint opacity={symbolOverlayOpacity} />}>
              <Group transform={[{ translateX: PADDING_H }]}>
                {symbolEntries.map((entry) => (
                  <SkiaText
                    key={entry.key}
                    color="#ffffff"
                    font={font}
                    text={entry.char}
                    x={entry.x}
                    y={numberY}
                  />
                ))}
              </Group>
            </Group>
          )}
        </Group>
      </Canvas>
    </View>
  );
};
