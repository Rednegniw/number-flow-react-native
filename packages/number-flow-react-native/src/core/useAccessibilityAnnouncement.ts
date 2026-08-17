import { useEffect, useRef } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Screen-reader state is a device-level setting: it is queried once per
 * process, kept current by a single `screenReaderChanged` subscription, and
 * cached so announcements do not pay an async native call per value change
 * (a grid of 30 components ticking at 10Hz issued ~300 of them per second).
 *
 * The cache is tri-state. While it is `null` (initial query still in flight,
 * or it rejected), each announcement falls back to querying directly so no
 * update is ever dropped; once a definitive answer exists the cached value
 * gates announcements synchronously.
 */
let screenReaderEnabled: boolean | null = null;
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

function announce(label: string): void {
  if (screenReaderEnabled === null) {
    AccessibilityInfo.isScreenReaderEnabled()
      .then((enabled) => {
        screenReaderEnabled = enabled;
        if (enabled) AccessibilityInfo.announceForAccessibility(label);
      })
      .catch(() => {});
    return;
  }

  if (screenReaderEnabled) AccessibilityInfo.announceForAccessibility(label);
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
    announce(label);
  }, [label]);
}
