import { useMemo } from "react";
import { getOrCreateFormatter, safeFormatToParts } from "./intlHelpers";
import { detectOutputZeroCodePoint, localeDigitValue } from "./numerals";
import type { KeyedPart } from "./types";

/**
 * Transforms `Intl.NumberFormat.formatToParts()` output into a flat array of
 * stably-keyed single-character parts. Integer digits are keyed right-to-left
 * (ones = `integer:0`, tens = `integer:1`, etc.) so that the ones place always
 * maps to the same React key regardless of digit count. Fraction digits are
 * keyed left-to-right from the decimal point (`fraction:0` = tenths, etc.).
 *
 * This keying ensures correct animation behavior when digits are added/removed
 * (e.g., 9→10: ones place spins 9→0, tens place enters as new digit).
 */
export function formatToKeyedParts(
  value: number,
  formatter: Intl.NumberFormat,
  locales: Intl.LocalesArgument | undefined,
  prefix = "",
  suffix = "",
): KeyedPart[] {
  const rawParts = safeFormatToParts(formatter, value, locales);

  /**
   * Detect the actual zero codepoint from the formatted output rather than
   * trusting resolvedOptions().numberingSystem. Hermes may report "arab" but
   * output Latin digits, or vice versa. Output-based detection is always correct.
   */
  const rawString = rawParts.map((p) => p.value).join("");
  const zeroCP = detectOutputZeroCodePoint(rawString);

  // Step 1: Flatten all parts into single characters with their source type
  interface FlatChar {
    sourceType: string;
    char: string;
  }

  const flatChars: FlatChar[] = [];

  for (const char of prefix) {
    flatChars.push({ sourceType: "prefix", char });
  }

  for (const part of rawParts) {
    // Merge signs into unified types.
    // The fallback parser emits extended types (exponentMinusSign, etc.)
    // that aren't in Intl.NumberFormatPart["type"], so we widen to string.
    const partType = part.type as string;
    const type =
      partType === "minusSign" || partType === "plusSign"
        ? "sign"
        : partType === "exponentMinusSign" || partType === "exponentPlusSign"
          ? "exponentSign"
          : partType;

    // Replace exponentSeparator "E" with ×10 display
    if (type === "exponentSeparator") {
      flatChars.push({ sourceType: "exponentSeparator", char: "\u00D7" });
      flatChars.push({ sourceType: "exponentSeparator", char: "1" });
      flatChars.push({ sourceType: "exponentSeparator", char: "0" });
      continue;
    }

    // Flatten digit sequences into individual characters
    if (type === "integer" || type === "fraction" || type === "exponentInteger") {
      for (const char of part.value) {
        flatChars.push({ sourceType: type, char });
      }
    } else {
      flatChars.push({ sourceType: type, char: part.value });
    }
  }

  for (const char of suffix) {
    flatChars.push({ sourceType: "suffix", char });
  }

  // Step 2: Key characters — integers+groups RTL, everything else LTR
  const result: KeyedPart[] = new Array(flatChars.length);
  const counts: Record<string, number> = {};

  const nextKey = (type: string) => `${type}:${(counts[type] = (counts[type] ?? -1) + 1)}`;

  // Find all integer + group indices (they form one contiguous block to key RTL)
  const integerGroupIndices: number[] = [];
  for (let i = 0; i < flatChars.length; i++) {
    if (flatChars[i].sourceType === "integer" || flatChars[i].sourceType === "group") {
      integerGroupIndices.push(i);
    }
  }

  /**
   * Key integer digits and group separators RTL — rightmost integer digit
   * gets "integer:0" (ones place), next gets "integer:1" (tens), etc.
   */
  for (let i = integerGroupIndices.length - 1; i >= 0; i--) {
    const idx = integerGroupIndices[i];
    const fc = flatChars[idx];
    const isDigit = fc.sourceType === "integer";
    result[idx] = {
      key: nextKey(fc.sourceType),
      type: isDigit ? "digit" : "symbol",
      char: fc.char,
      digitValue: isDigit ? localeDigitValue(fc.char.charCodeAt(0), zeroCP) : -1,
    };
  }

  // Find all exponent integer indices (key RTL, same logic as mantissa integers)
  const exponentIntegerIndices: number[] = [];
  for (let i = 0; i < flatChars.length; i++) {
    if (flatChars[i].sourceType === "exponentInteger") {
      exponentIntegerIndices.push(i);
    }
  }

  for (let i = exponentIntegerIndices.length - 1; i >= 0; i--) {
    const idx = exponentIntegerIndices[i];
    const fc = flatChars[idx];
    result[idx] = {
      key: nextKey("exponentInteger"),
      type: "digit",
      char: fc.char,
      digitValue: localeDigitValue(fc.char.charCodeAt(0), zeroCP),
    };
  }

  // Key everything else LTR (fraction, decimal, prefix, suffix, exponentSeparator, exponentSign, etc.)
  for (let i = 0; i < flatChars.length; i++) {
    if (result[i]) continue; // already keyed (integer, group, or exponentInteger)
    const fc = flatChars[i];
    const isDigit = fc.sourceType === "fraction";
    result[i] = {
      key: nextKey(fc.sourceType),
      type: isDigit ? "digit" : "symbol",
      char: fc.char,
      digitValue: isDigit ? localeDigitValue(fc.char.charCodeAt(0), zeroCP) : -1,
    };
  }

  return result;
}

/**
 * Hook that formats a numeric value into stably-keyed character parts.
 * Uses Intl.NumberFormat.formatToParts() with RTL integer keying.
 */
export function useNumberFormatting(
  value: number | undefined,
  format: Intl.NumberFormatOptions | undefined,
  locales: Intl.LocalesArgument | undefined,
  prefix: string,
  suffix: string,
): KeyedPart[] {
  // Serialize format/locales to a stable string — avoids re-runs when callers pass inline objects
  const formatKey = useMemo(() => JSON.stringify([locales, format]), [locales, format]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: formatKey serializes locales+format into a stable string to avoid re-runs on inline objects
  return useMemo(() => {
    if (value === undefined) return [];
    const formatter = getOrCreateFormatter(locales, format);
    return formatToKeyedParts(value, formatter, locales, prefix, suffix);
  }, [value, prefix, suffix, formatKey]);
}
