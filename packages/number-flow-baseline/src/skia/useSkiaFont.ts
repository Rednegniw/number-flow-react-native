import type { DataSourceParam, SkFont } from "@shopify/react-native-skia";
import { matchFont, useFont } from "@shopify/react-native-skia";
import { useMemo } from "react";

/**
 * Loads a custom Skia font asynchronously while providing a synchronous
 * system-font fallback via `matchFont`. This guarantees a non-null `SkFont`
 * from the very first render, so components can run the full animated pipeline
 * immediately instead of showing a blank canvas or static placeholder.
 *
 * Once the custom font finishes loading, the returned value swaps to the
 * custom font, triggering a smooth animated transition in SkiaNumberFlow /
 * SkiaTimeFlow (the value re-renders with new glyph metrics).
 */
export function useSkiaFont(
  source: DataSourceParam,
  size: number,
  onError?: (err: Error) => void,
): SkFont {
  const font = useFont(source, size, onError);

  const fallback = useMemo(() => matchFont({ fontSize: size }), [size]);

  return font ?? fallback;
}
