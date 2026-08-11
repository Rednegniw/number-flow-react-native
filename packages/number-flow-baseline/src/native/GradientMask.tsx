import type { ReactElement } from "react";
import { useMemo } from "react";
import { Platform, View, type ViewStyle } from "react-native";
import MaskedView from "./MaskedView";

const RN_VERSION = Platform.constants.reactNativeVersion;
const SUPPORTS_BG_IMAGE = RN_VERSION.major > 0 || RN_VERSION.minor >= 76;

const FALLBACK_STEPS = 48;

interface GradientMaskProps {
  maskTop: number;
  maskBottom: number;
  enabled: boolean;
  style?: ViewStyle;
  children: React.ReactNode;
}

function buildGradientMaskElement(maskTop: number, maskBottom: number): ReactElement {
  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      {/* Top fade: transparent -> opaque */}
      {maskTop > 0 && (
        <View
          style={{
            height: maskTop,
            experimental_backgroundImage: [
              {
                type: "linear-gradient",
                direction: "to bottom",
                colorStops: [{ color: "transparent" }, { color: "black" }],
              },
            ],
          }}
        />
      )}

      {/* Middle: fully opaque */}
      <View style={{ flex: 1, backgroundColor: "black" }} />

      {/* Bottom fade: opaque -> transparent */}
      {maskBottom > 0 && (
        <View
          style={{
            height: maskBottom,
            experimental_backgroundImage: [
              {
                type: "linear-gradient",
                direction: "to bottom",
                colorStops: [{ color: "black" }, { color: "transparent" }],
              },
            ],
          }}
        />
      )}
    </View>
  );
}

function buildFallbackMaskElement(maskTop: number, maskBottom: number): ReactElement {
  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      {/* Top fade: transparent -> opaque */}
      {maskTop > 0 &&
        Array.from({ length: FALLBACK_STEPS }, (_, i) => (
          <View
            key={`t${i}`}
            style={{
              height: (maskTop + FALLBACK_STEPS - 1) / FALLBACK_STEPS,
              marginBottom: -1,
              backgroundColor: `rgba(0,0,0,${i / (FALLBACK_STEPS - 1)})`,
            }}
          />
        ))}

      {/* Middle: fully opaque */}
      <View style={{ flex: 1, backgroundColor: "black" }} />

      {/* Bottom fade: opaque -> transparent */}
      {maskBottom > 0 &&
        Array.from({ length: FALLBACK_STEPS }, (_, i) => (
          <View
            key={`b${i}`}
            style={{
              height: (maskBottom + FALLBACK_STEPS - 1) / FALLBACK_STEPS,
              marginBottom: -1,
              backgroundColor: `rgba(0,0,0,${1 - i / (FALLBACK_STEPS - 1)})`,
            }}
          />
        ))}
    </View>
  );
}

/**
 * Native gradient mask using MaskedView.
 *
 * On RN 0.76+, uses `experimental_backgroundImage` with `linear-gradient` for
 * a continuous, gap-free gradient. On older versions, falls back to discrete
 * View strips with overlap to approximate the gradient.
 *
 * When MaskedView is unavailable, renders children directly (per-digit opacity
 * fading handles the visual approximation in that case).
 */
export const GradientMask = ({
  maskTop,
  maskBottom,
  enabled,
  style,
  children,
}: GradientMaskProps) => {
  const maskElement = useMemo<ReactElement | null>(() => {
    if (!enabled) return null;

    return SUPPORTS_BG_IMAGE
      ? buildGradientMaskElement(maskTop, maskBottom)
      : buildFallbackMaskElement(maskTop, maskBottom);
  }, [enabled, maskTop, maskBottom]);

  if (enabled && maskElement && MaskedView) {
    return (
      <MaskedView maskElement={maskElement} style={style}>
        {children}
      </MaskedView>
    );
  }

  return <>{children}</>;
};
