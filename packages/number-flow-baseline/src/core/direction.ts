import { I18nManager, type TextStyle } from "react-native";
import type { Direction, ResolvedTextAlign, TextAlign } from "./types";

/**
 * Resolves a Direction prop to a concrete "ltr" or "rtl".
 * When omitted or "auto", reads from I18nManager.isRTL (the system setting).
 */
export function resolveDirection(direction?: Direction): "ltr" | "rtl" {
  if (direction === "ltr" || direction === "rtl") return direction;
  return I18nManager.isRTL ? "rtl" : "ltr";
}

/**
 * Resolves semantic TextAlign values ("start", "end") to physical values
 * ("left", "right") based on the resolved direction.
 * Accepts both our TextAlign ("start"/"end") and RN's TextStyle["textAlign"]
 * ("auto"/"justify") so callers don't need to cast. Unhandled values fall
 * through to the "start" default.
 */
export function resolveTextAlign(
  resolvedDirection: "ltr" | "rtl",
  textAlign?: TextAlign | TextStyle["textAlign"],
): ResolvedTextAlign {
  if (textAlign === "center") return "center";
  if (textAlign === "left") return "left";
  if (textAlign === "right") return "right";

  const isRtl = resolvedDirection === "rtl";

  if (textAlign === "end") return isRtl ? "left" : "right";

  // "start", "auto", "justify", or undefined all default to "start"
  return isRtl ? "right" : "left";
}
