import { Canvas } from "@shopify/react-native-skia";
import type { Direction } from "number-flow-react-native";
import { NumberFlow } from "number-flow-react-native/native";
import { SkiaNumberFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
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

const NOTO_ARABIC = require("../../assets/fonts/NotoSansArabic.ttf");

interface Row {
  label: string;
  locale: string;
  currency: string;
  value: number;
  note: string;
}

const ROWS: Row[] = [
  {
    label: "Arabic +",
    locale: "ar-EG",
    currency: "EGP",
    value: 1234.56,
    note: "currency moves left",
  },
  {
    label: "Arabic -",
    locale: "ar-EG",
    currency: "EGP",
    value: -1234.56,
    note: "minus moves right",
  },
  { label: "Hebrew +", locale: "he-IL", currency: "ILS", value: 1234.56, note: "₪ moves left" },
  {
    label: "Hebrew -",
    locale: "he-IL",
    currency: "ILS",
    value: -1234.56,
    note: "minus stays with digits",
  },
  {
    label: "Persian +",
    locale: "fa-IR",
    currency: "IRR",
    value: 1234.56,
    note: "no reorder (LRM)",
  },
  {
    label: "English +",
    locale: "en-US",
    currency: "USD",
    value: 1234.56,
    note: "no reorder (LTR)",
  },
];

function useRTLDemoState() {
  const [isRtl, setIsRtl] = useState(true);
  const direction: Direction = isRtl ? "rtl" : "ltr";

  const toggleDirection = useCallback(() => {
    setIsRtl((prev) => !prev);
  }, []);

  return { isRtl, direction, toggleDirection };
}

const RowLabel = ({ row, isRtl }: { row: Row; isRtl: boolean }) => {
  const isAffected = isRtl && (row.locale.startsWith("ar") || row.locale.startsWith("he"));

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text }}>{row.label}</Text>
      <Text style={{ fontSize: 10, color: isAffected ? "#059669" : colors.textSecondary }}>
        {isRtl ? row.note : "logical order"}
      </Text>
    </View>
  );
};

const InfoBanner = () => (
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
      Bidi reordering is automatic: Arabic/Hebrew formats start with RLM, triggering visual
      reordering. Persian starts with LRM, keeping logical order. Toggle RTL/LTR to see currency
      symbols animate to the correct side.
    </Text>
  </View>
);

export const RTLDemoNative = () => {
  const { isRtl, direction, toggleDirection } = useRTLDemoState();

  return (
    <View style={{ gap: 10 }}>
      {/* Direction toggle */}
      <DemoButton
        active={isRtl}
        label={isRtl ? "RTL - bidi reordering active" : "LTR - logical order"}
        onPress={toggleDirection}
      />

      {/* All rows */}
      {ROWS.map((row) => {
        const format: Intl.NumberFormatOptions = {
          style: "currency",
          currency: row.currency,
        };

        return (
          <View key={row.label} style={{ gap: 4 }}>
            <RowLabel row={row} isRtl={isRtl} />
            <View
              style={{
                backgroundColor: colors.demoBackground,
                borderRadius: 10,
                paddingVertical: 12,
                paddingHorizontal: 16,
              }}
            >
              <NumberFlow
                containerStyle={{ width: "100%" }}
                direction={direction}
                format={format}
                locales={row.locale}
                style={{
                  fontFamily: DEMO_FONT_FAMILY,
                  fontSize: 24,
                  color: DEMO_TEXT_COLOR,
                }}
                value={row.value}
              />
            </View>
          </View>
        );
      })}

      {/* Info banner */}
      <InfoBanner />
    </View>
  );
};

export const RTLDemoSkia = () => {
  const { isRtl, direction, toggleDirection } = useRTLDemoState();

  const arabicFont = useSkiaFont(NOTO_ARABIC, 24);
  const latinFont = useSkiaFont(DEMO_SKIA_FONT_ASSET, 24);

  return (
    <View style={{ gap: 10 }}>
      {/* Direction toggle */}
      <DemoButton
        active={isRtl}
        label={isRtl ? "RTL - bidi reordering active" : "LTR - logical order"}
        onPress={toggleDirection}
      />

      {/* All rows */}
      {ROWS.map((row) => {
        const isArabicScript = row.locale.startsWith("ar") || row.locale.startsWith("fa");
        const font = isArabicScript ? arabicFont : latinFont;

        const format: Intl.NumberFormatOptions = {
          style: "currency",
          currency: row.currency,
        };

        return (
          <View key={row.label} style={{ gap: 4 }}>
            <RowLabel row={row} isRtl={isRtl} />
            <View
              style={{
                backgroundColor: colors.demoBackground,
                borderRadius: 10,
                paddingVertical: 12,
                paddingHorizontal: 16,
                alignItems: "center",
              }}
            >
              <Canvas style={{ width: CANVAS_WIDTH, height: 36 }}>
                <SkiaNumberFlow
                  color={DEMO_TEXT_COLOR}
                  direction={direction}
                  font={font}
                  format={format}
                  locales={row.locale}
                  value={row.value}
                  width={CANVAS_WIDTH}
                  y={24}
                />
              </Canvas>
            </View>
          </View>
        );
      })}

      {/* Info banner */}
      <InfoBanner />
    </View>
  );
};
