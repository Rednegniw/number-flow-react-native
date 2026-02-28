import type { ReactElement } from "react";
import type { ViewProps } from "react-native";

interface MaskedViewProps extends ViewProps {
  maskElement: ReactElement;
}

/**
 * Resolves `@rednegniw/masked-view` if installed. Returns null when the
 * package isn't available, allowing the caller to fall back to per-digit
 * opacity fading.
 *
 * Only `@rednegniw/masked-view` (Fabric-compatible fork) is supported.
 * The community `@react-native-masked-view/masked-view` is intentionally
 * excluded because it crashes on Fabric (New Architecture).
 */
let Resolved: React.ComponentType<MaskedViewProps> | null = null;
try {
  Resolved = require("@rednegniw/masked-view").default;
} catch {
  // Not installed: masking falls back to per-digit opacity
}

export default Resolved;
