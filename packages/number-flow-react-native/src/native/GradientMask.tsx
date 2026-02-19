import type { ReactElement } from "react";
import { useMemo } from "react";
import { View, type ViewStyle } from "react-native";
import MaskedView from "./MaskedView";

interface GradientMaskProps {
  maskTop: number;
  maskBottom: number;
  enabled: boolean;
  style?: ViewStyle;
  children: React.ReactNode;
}

/**
 * Native gradient mask using MaskedView with discrete View strips.
 *
 * When enabled and MaskedView is available, wraps children in a gradient
 * mask that fades from transparent at the edges to opaque in the middle.
 * Falls back to rendering children directly when MaskedView is unavailable
 * (per-digit opacity fading handles the visual approximation in that case).
 */
export const GradientMask = ({
  maskTop,
  maskBottom,
  enabled,
  style,
  children,
}: GradientMaskProps) => {
  const topSteps = Math.max(2, Math.round(maskTop));
  const bottomSteps = Math.max(2, Math.round(maskBottom));

  const maskElement = useMemo<ReactElement | null>(() => {
    if (!enabled) return null;

    return (
      <View style={{ flex: 1, flexDirection: "column" }}>
        {/* Top fade: transparent -> opaque */}
        {Array.from({ length: topSteps }, (_, i) => (
          <View
            key={`t${i}`}
            style={{
              height: maskTop / topSteps,
              backgroundColor: `rgba(0,0,0,${i / (topSteps - 1)})`,
            }}
          />
        ))}

        {/* Middle: fully opaque */}
        <View style={{ flex: 1, backgroundColor: "black" }} />

        {/* Bottom fade: opaque -> transparent */}
        {Array.from({ length: bottomSteps }, (_, i) => (
          <View
            key={`b${i}`}
            style={{
              height: maskBottom / bottomSteps,
              backgroundColor: `rgba(0,0,0,${1 - i / (bottomSteps - 1)})`,
            }}
          />
        ))}
      </View>
    );
  }, [enabled, maskTop, maskBottom, topSteps, bottomSteps]);

  if (enabled && maskElement && MaskedView) {
    return (
      <MaskedView maskElement={maskElement} style={style}>
        {children}
      </MaskedView>
    );
  }

  return <>{children}</>;
};
