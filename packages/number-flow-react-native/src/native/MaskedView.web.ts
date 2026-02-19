/**
 * Web stub for MaskedView. On native, MaskedView.tsx dynamically requires
 * @rednegniw/masked-view, but that package ships TypeScript non-null assertion
 * syntax in its .web.js file, crashing Metro's parser. This platform file
 * ensures the broken upstream code is never reached on web.
 *
 * NumberFlow and TimeFlow already handle MaskedView === null by falling back
 * to per-digit opacity fading.
 */
export default null;
