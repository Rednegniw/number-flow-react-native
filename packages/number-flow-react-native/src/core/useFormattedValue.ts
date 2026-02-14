import { useMemo } from "react";
import { getOrCreateFormatter } from "./useNumberFormatting";

/**
 * Formats a numeric value to a display string using Intl.NumberFormat, with optional prefix/suffix.
 * Useful for providing an accessibility label on a parent Canvas for Skia components:
 *
 * ```tsx
 * const label = useFormattedValue(value, { style: "currency", currency: "USD" });
 *
 * <Canvas accessible accessibilityLabel={label}>
 *   <SkiaNumberFlow value={value} font={font} format={{ style: "currency", currency: "USD" }} />
 * </Canvas>
 * ```
 */
export function useFormattedValue(
  value: number | undefined,
  format?: Intl.NumberFormatOptions,
  locales?: Intl.LocalesArgument,
  prefix?: string,
  suffix?: string,
): string | undefined {
  const formatKey = useMemo(
    () => JSON.stringify([locales, format]),
    [locales, format],
  );

  return useMemo(() => {
    if (value === undefined) return undefined;
    const formatter = getOrCreateFormatter(locales, format);
    return `${prefix ?? ""}${formatter.format(value)}${suffix ?? ""}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, formatKey, prefix, suffix]);
}
