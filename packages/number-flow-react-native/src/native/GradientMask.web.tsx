import { useMemo } from "react";
import { View, type ViewStyle } from "react-native";

interface GradientMaskProps {
  maskTop: number;
  maskBottom: number;
  enabled: boolean;
  style?: ViewStyle;
  children: React.ReactNode;
}

/**
 * Web gradient mask using CSS `mask-image` with `linear-gradient`.
 *
 * Instead of the native MaskedView approach (discrete View strips), this uses
 * a single CSS gradient, the same technique the original web NumberFlow uses.
 * This gives pixel-perfect smooth gradient masking with zero DOM overhead.
 */
export const GradientMask = ({
  maskTop,
  maskBottom,
  enabled,
  style,
  children,
}: GradientMaskProps) => {
  const maskStyle = useMemo(() => {
    if (!enabled) return null;

    const gradient = `linear-gradient(to bottom, transparent, black ${maskTop}px, black calc(100% - ${maskBottom}px), transparent)`;
    return { WebkitMaskImage: gradient, maskImage: gradient } as ViewStyle;
  }, [enabled, maskTop, maskBottom]);

  if (!maskStyle) {
    return <>{children}</>;
  }

  return <View style={[style, maskStyle]}>{children}</View>;
};
