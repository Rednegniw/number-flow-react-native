import type { ReactElement } from "react";
import type { ViewProps } from "react-native";

interface MaskedViewProps extends ViewProps {
  maskElement: ReactElement;
}

/**
 * Resolves the first available masked-view implementation. Returns null when
 * none is installed, allowing the caller to fall back to per-digit opacity
 * fading.
 *
 * Resolution order:
 * 1. `@rednegniw/masked-view` - Fabric-compatible fork with a lightweight
 *    platform mask (CALayer maskView / Android hardware layer).
 * 2. `@expo/ui/community/masked-view` - SwiftUI/Jetpack Compose based,
 *    drop-in API, ships with `@expo/ui` 56.0.3+ (Expo SDK 56). Only resolves
 *    in Expo projects; the require throws elsewhere and is caught below.
 *
 * The community `@react-native-masked-view/masked-view` is intentionally
 * excluded because it crashes on Fabric (New Architecture).
 */
let Resolved: React.ComponentType<MaskedViewProps> | null = null;
try {
  Resolved = require("@rednegniw/masked-view").default;
} catch {
  // Not installed: try @expo/ui below
}

if (!Resolved) {
  try {
    Resolved = require("@expo/ui/community/masked-view").default;
  } catch {
    // Not installed either: masking falls back to per-digit opacity
  }
}

export default Resolved ?? null;
