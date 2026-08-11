import { useEffect, useRef } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Screen-reader state is a device-level setting, so it is queried once per
 * process and kept current by a single subscription, rather than re-queried
 * on every announcement.
 *
 * `isScreenReaderEnabled()` is an async native call. Querying it per label
 * change meant one native round trip per component per value change: a grid of
 * 30 Skia components ticking at 10Hz issued ~300 of them per second, all to
 * re-read a setting that almost never changes.
 */
let screenReaderEnabled = false;
let tracking = false;

function trackScreenReader(): void {
  if (tracking) return;
  tracking = true;

  AccessibilityInfo.isScreenReaderEnabled()
    .then((enabled) => {
      screenReaderEnabled = enabled;
    })
    .catch(() => {});

  // Process-lifetime subscription: one listener total, not one per component
  AccessibilityInfo.addEventListener("screenReaderChanged", (enabled) => {
    screenReaderEnabled = enabled;
  });
}

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
    trackScreenReader();

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!label) return;
    if (!screenReaderEnabled) return;

    AccessibilityInfo.announceForAccessibility(label);
  }, [label]);
}
