/**
 * Web stub for MaskedView. On native, MaskedView.tsx dynamically requires
 * @rednegniw/masked-view (whose .web.js ships TypeScript non-null assertion
 * syntax that crashes Metro's parser) or @expo/ui/community/masked-view
 * (whose web fallback renders children unmasked with a console warning).
 * This platform file ensures neither is reached on web, where CSS
 * mask-image handles gradient masking instead.
 *
 * NumberFlow and TimeFlow already handle MaskedView === null by falling back
 * to per-digit opacity fading.
 */
export default null;
