import type { CharLayout } from "./layout";
import type { GlyphMetrics } from "./types";

// Target gradient size as a ratio of lineHeight.
// The gradient will be at least this tall, expanding the container if needed.
const TARGET_GRADIENT_RATIO = 0.2;

// Small inset so the gradient doesn't start right at the glyph boundary.
const PADDING_PX = 2;

export interface MaskHeights {
  // Total gradient height at the top edge
  top: number;
  // Total gradient height at the bottom edge
  bottom: number;
  // How much the container must expand beyond lineHeight at the top
  expansionTop: number;
  // How much the container must expand beyond lineHeight at the bottom
  expansionBottom: number;
}

/**
 * Computes adaptive vertical mask heights based on the actual characters
 * currently displayed.
 *
 * The gradient starts at the edge of the visible glyph content and extends
 * outward. If the "dead zone" inside lineHeight is smaller than the target
 * gradient size, the container expands beyond lineHeight (callers should
 * use negative margins to avoid affecting layout).
 */
export function computeAdaptiveMaskHeights(
  layout: CharLayout[],
  exitingEntries: Map<string, CharLayout>,
  metrics: GlyphMetrics,
): MaskHeights {
  let maxAscent = 0;
  let maxDescent = 0;

  const processChar = (char: string) => {
    const bounds = metrics.charBounds[char];
    if (!bounds) return;

    if (bounds.top < maxAscent) maxAscent = bounds.top;
    if (bounds.bottom > maxDescent) maxDescent = bounds.bottom;
  };

  for (const entry of layout) {
    if (entry.superscript) continue;
    processChar(entry.char);
  }

  for (const [, entry] of exitingEntries) {
    if (entry.superscript) continue;
    processChar(entry.char);
  }

  const targetGradient = TARGET_GRADIENT_RATIO * metrics.lineHeight;

  // Dead zone: space within lineHeight not occupied by glyph content.
  const deadZoneTop = Math.max(0, -metrics.ascent - (-maxAscent) - PADDING_PX);
  const deadZoneBottom = Math.max(0, metrics.descent - maxDescent - PADDING_PX);

  // If the dead zone is smaller than the target, expand the container.
  const expansionTop = Math.max(0, targetGradient - deadZoneTop);
  const expansionBottom = Math.max(0, targetGradient - deadZoneBottom);

  return {
    top: deadZoneTop + expansionTop,
    bottom: deadZoneBottom + expansionBottom,
    expansionTop,
    expansionBottom,
  };
}
