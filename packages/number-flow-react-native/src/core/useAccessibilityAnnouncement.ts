import { useEffect, useRef } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Announces label changes to screen readers for Skia components.
 *
 * Skia renders inside <Canvas>, which is opaque to the accessibility tree.
 * This hook auto-announces value changes when a screen reader is active
 * so users get audio feedback. The first render is skipped to avoid
 * announcing the initial value.
 */
export function useAccessibilityAnnouncement(label: string | undefined): void {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!label) return;

    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (enabled) AccessibilityInfo.announceForAccessibility(label);
    });
  }, [label]);
}
