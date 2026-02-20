import { Canvas, type SkFont } from "@shopify/react-native-skia";
import { detectNumberingSystem, getDigitStrings, getZeroCodePoint } from "number-flow-react-native";
import { NumberFlow } from "number-flow-react-native/native";
import { SkiaNumberFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useMemo, useState } from "react";
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
import { FONT_REGULAR } from "../theme/fonts";
import { randomValue } from "./utils";

// Script-specific Noto Sans fonts for Skia rendering
const NOTO_ARABIC = require("../../assets/fonts/NotoSansArabic.ttf");
const NOTO_BENGALI = require("../../assets/fonts/NotoSansBengali.ttf");
const NOTO_DEVANAGARI = require("../../assets/fonts/NotoSansDevanagari.ttf");
const NOTO_MYANMAR = require("../../assets/fonts/NotoSansMyanmar.ttf");
const NOTO_THAI = require("../../assets/fonts/NotoSansThai.ttf");

interface NumeralSystem {
  label: string;
  locale: string;
  digits: string;
  fontKey: string;
}

const SYSTEMS: NumeralSystem[] = [
  { label: "Latin", locale: "en-US", digits: "0123456789", fontKey: "latin" },
  {
    label: "Arabic-Indic",
    locale: "ar-EG",
    digits: "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669",
    fontKey: "arabic",
  },
  {
    label: "Ext. Arabic",
    locale: "fa-IR",
    digits: "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9",
    fontKey: "arabic",
  },
  {
    label: "Bengali",
    locale: "bn-BD",
    digits: "\u09E6\u09E7\u09E8\u09E9\u09EA\u09EB\u09EC\u09ED\u09EE\u09EF",
    fontKey: "bengali",
  },
  {
    label: "Devanagari",
    locale: "ne-NP",
    digits: "\u0966\u0967\u0968\u0969\u096A\u096B\u096C\u096D\u096E\u096F",
    fontKey: "devanagari",
  },
  {
    label: "Myanmar",
    locale: "my-MM",
    digits: "\u1040\u1041\u1042\u1043\u1044\u1045\u1046\u1047\u1048\u1049",
    fontKey: "myanmar",
  },
  {
    label: "Thai",
    locale: "th-TH-u-nu-thai",
    digits: "\u0E50\u0E51\u0E52\u0E53\u0E54\u0E55\u0E56\u0E57\u0E58\u0E59",
    fontKey: "thai",
  },
  {
    label: "Full-width",
    locale: "ja-JP-u-nu-fullwide",
    digits: "\uFF10\uFF11\uFF12\uFF13\uFF14\uFF15\uFF16\uFF17\uFF18\uFF19",
    fontKey: "cjk",
  },
  {
    label: "Hanidec",
    locale: "zh-CN-u-nu-hanidec",
    digits: "\u3007\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D",
    fontKey: "cjk",
  },
];

// CJK fonts are too large to bundle (~10 MB+), so these systems are unsupported in Skia mode
const CJK_UNSUPPORTED = new Set(["cjk"]);

/**
 * Gathers diagnostic info about how the current JS engine handles
 * Intl.NumberFormat for a given locale. Useful for debugging Hermes
 * numeral system mismatches on physical devices.
 */
function getDiagnostics(locale: string, value: number) {
  const fmt = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const resolved = fmt.resolvedOptions();
  const formatted = fmt.format(value);

  let partsStr = "(no formatToParts)";
  if (typeof fmt.formatToParts === "function") {
    const parts = fmt.formatToParts(value);
    partsStr = parts.map((p) => `${p.type}:"${p.value}"`).join(" | ");
  }

  const detected = detectNumberingSystem(locale);
  const zeroCp = getZeroCodePoint(detected);
  const digits = getDigitStrings(detected);

  return {
    platform: resolved.numberingSystem,
    detected,
    zeroCp: `0x${zeroCp.toString(16).toUpperCase().padStart(4, "0")}`,
    formatted,
    parts: partsStr,
    digitStrings: digits.join(""),
  };
}

function useNumeralsDemoState() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [value, setValue] = useState(1234.56);
  const [currency, setCurrency] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const system = SYSTEMS[selectedIndex];

  const randomize = useCallback(() => {
    setValue(randomValue());
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrency((c) => !c);
  }, []);

  const format: Intl.NumberFormatOptions = currency
    ? { style: "currency", currency: "USD", minimumFractionDigits: 2 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 };

  const diag = useMemo(
    () => (showDebug ? getDiagnostics(system.locale, value) : null),
    [showDebug, system.locale, value],
  );

  return {
    selectedIndex,
    setSelectedIndex,
    value,
    currency,
    showDebug,
    setShowDebug,
    system,
    format,
    diag,
    randomize,
    toggleCurrency,
  };
}

const NumeralChips = ({
  selectedIndex,
  onSelect,
}: {
  selectedIndex: number;
  onSelect: (i: number) => void;
}) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
    {SYSTEMS.map((sys, i) => {
      const isSelected = i === selectedIndex;
      return (
        <Pressable
          key={sys.locale}
          onPress={() => onSelect(i)}
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
            {sys.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const ActionButtons = ({
  currency,
  showDebug,
  onRandomize,
  onToggleCurrency,
  onToggleDebug,
}: {
  currency: boolean;
  showDebug: boolean;
  onRandomize: () => void;
  onToggleCurrency: () => void;
  onToggleDebug: () => void;
}) => (
  <View style={{ flexDirection: "row", gap: 8 }}>
    <DemoButton label="Randomize" onPress={onRandomize} style={{ flex: 1 }} />
    <DemoButton
      active={currency}
      label={currency ? "Currency" : "Decimal"}
      onPress={onToggleCurrency}
      style={{ flex: 1 }}
    />
    <DemoButton
      active={showDebug}
      activeColor="#ffe0e0"
      label="Debug"
      onPress={onToggleDebug}
      style={{ paddingHorizontal: 16 }}
    />
  </View>
);

const DebugPanel = ({ diag }: { diag: ReturnType<typeof getDiagnostics> }) => (
  <View
    style={{
      backgroundColor: "#1a1a2e",
      borderRadius: 8,
      padding: 12,
      gap: 4,
    }}
  >
    <Text style={{ fontSize: 10, fontFamily: FONT_REGULAR, color: "#7fdbca" }}>
      {`platform: "${diag.platform}"  detected: "${diag.detected}"`}
    </Text>
    <Text style={{ fontSize: 10, fontFamily: FONT_REGULAR, color: "#c792ea" }}>
      {`zeroCp: ${diag.zeroCp}  digits: ${diag.digitStrings}`}
    </Text>
    <Text style={{ fontSize: 10, fontFamily: FONT_REGULAR, color: "#ffcb6b" }}>
      {`format(): "${diag.formatted}"`}
    </Text>
    <Text style={{ fontSize: 10, fontFamily: FONT_REGULAR, color: "#82aaff" }}>
      {`parts: ${diag.parts}`}
    </Text>
  </View>
);

const FontExplainer = ({ fontName }: { fontName: string }) => (
  <View
    style={{
      backgroundColor: "#EEF2FF",
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: "#C7D2FE",
    }}
  >
    <Text style={{ fontSize: 11, color: "#4338CA", lineHeight: 16 }}>
      Skia renders with {fontName}. Unlike native Text which uses OS font fallback, Skia needs an
      explicit font file per script.
    </Text>
  </View>
);

const CjkUnsupportedBanner = () => (
  <View
    style={{
      backgroundColor: "#FEF3C7",
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: "#FCD34D",
    }}
  >
    <Text style={{ fontSize: 11, color: "#92400E", lineHeight: 16 }}>
      CJK fonts are too large to bundle in a demo app (~10 MB). This script is only available in
      Native mode.
    </Text>
  </View>
);

function useScriptFonts() {
  const latin = useSkiaFont(DEMO_SKIA_FONT_ASSET, DEMO_FONT_SIZE);
  const arabic = useSkiaFont(NOTO_ARABIC, DEMO_FONT_SIZE);
  const bengali = useSkiaFont(NOTO_BENGALI, DEMO_FONT_SIZE);
  const devanagari = useSkiaFont(NOTO_DEVANAGARI, DEMO_FONT_SIZE);
  const myanmar = useSkiaFont(NOTO_MYANMAR, DEMO_FONT_SIZE);
  const thai = useSkiaFont(NOTO_THAI, DEMO_FONT_SIZE);

  const fontMap: Record<string, SkFont> = {
    latin,
    arabic,
    bengali,
    devanagari,
    myanmar,
    thai,
  };

  return fontMap;
}

const FONT_NAMES: Record<string, string> = {
  latin: "Inter SemiBold",
  arabic: "Noto Sans Arabic",
  bengali: "Noto Sans Bengali",
  devanagari: "Noto Sans Devanagari",
  myanmar: "Noto Sans Myanmar",
  thai: "Noto Sans Thai",
};

export const NumeralsDemoNative = () => {
  const state = useNumeralsDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* State info */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        {`locales="${state.system.locale}" — ${state.system.digits}`}
      </Text>

      {/* Numeral system chips */}
      <NumeralChips selectedIndex={state.selectedIndex} onSelect={state.setSelectedIndex} />

      {/* Number display */}
      <View
        style={{
          backgroundColor: colors.demoBackground,
          borderRadius: 12,
          padding: 20,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 80,
        }}
      >
        <NumberFlow
          containerStyle={{ width: CANVAS_WIDTH }}
          format={state.format}
          locales={state.system.locale}
          style={{
            fontFamily: DEMO_FONT_FAMILY,
            fontSize: DEMO_FONT_SIZE,
            color: DEMO_TEXT_COLOR,
            textAlign: "center",
          }}
          value={state.value}
        />
      </View>

      {/* Action buttons */}
      <ActionButtons
        currency={state.currency}
        showDebug={state.showDebug}
        onRandomize={state.randomize}
        onToggleCurrency={state.toggleCurrency}
        onToggleDebug={() => state.setShowDebug((d) => !d)}
      />

      {/* Debug panel */}
      {state.diag && <DebugPanel diag={state.diag} />}
    </View>
  );
};

export const NumeralsDemoSkia = () => {
  const fontMap = useScriptFonts();
  const state = useNumeralsDemoState();

  const isCjk = CJK_UNSUPPORTED.has(state.system.fontKey);
  const currentFont = fontMap[state.system.fontKey] ?? null;
  const fontName = FONT_NAMES[state.system.fontKey] ?? "unknown";

  return (
    <View style={{ gap: 8 }}>
      {/* State info */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        {`locales="${state.system.locale}" — ${state.system.digits}`}
      </Text>

      {/* Numeral system chips */}
      <NumeralChips selectedIndex={state.selectedIndex} onSelect={state.setSelectedIndex} />

      {/* Number display */}
      {isCjk ? (
        <CjkUnsupportedBanner />
      ) : (
        <View
          style={{
            backgroundColor: colors.demoBackground,
            borderRadius: 12,
            padding: 20,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 80,
          }}
        >
          <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
            <SkiaNumberFlow
              color={DEMO_TEXT_COLOR}
              font={currentFont}
              format={state.format}
              locales={state.system.locale}
              textAlign="center"
              value={state.value}
              width={CANVAS_WIDTH}
              y={DEMO_FONT_SIZE}
            />
          </Canvas>
        </View>
      )}

      {/* Font explainer */}
      {!isCjk && <FontExplainer fontName={fontName} />}

      {/* Action buttons */}
      <ActionButtons
        currency={state.currency}
        showDebug={state.showDebug}
        onRandomize={state.randomize}
        onToggleCurrency={state.toggleCurrency}
        onToggleDebug={() => state.setShowDebug((d) => !d)}
      />

      {/* Debug panel */}
      {state.diag && <DebugPanel diag={state.diag} />}
    </View>
  );
};
