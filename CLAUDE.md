# number-flow-react-native

## What this project is

An animated number transition library for React Native, inspired by the web-based [NumberFlow](https://number-flow.barvian.me/) by Maxwell Barvian. It provides smooth digit-by-digit rolling animations for displaying numeric values with support for currencies, locales, and time formats.

## Monorepo structure

Bun workspaces monorepo:
- **`packages/number-flow-react-native/`** - The publishable library
- **`apps/example/`** - Expo SDK 54 example app (RN 0.81, Reanimated v4)
- **`docs/`** - Fumadocs (Next.js 16) documentation site, deployed on Vercel

## Architecture

Two rendering backends sharing a common core (all under `packages/number-flow-react-native/src/`):

- **`core/`** - Shared logic: formatting (Intl.NumberFormat), layout computation, easing curves, types, utilities
- **`native/`** - View-based renderer using React Native Animated + Reanimated SharedValues
- **`skia/`** - Canvas-based renderer using @shopify/react-native-skia

### Key components
- `NumberFlow` / `SkiaNumberFlow` - Animated number display
- `TimeFlow` / `SkiaTimeFlow` - Animated time display (HH:MM:SS)

### How the animation works
- Each digit position renders a virtual wheel of digits 0-9 stacked vertically
- Rolling is achieved by translating the wheel's Y position
- `computeRollDelta()` calculates rotation direction (shortest path or forced up/down)
- Fixed pool of up to 20 "slots" with pre-allocated SharedValues avoids component recreation
- Enter/exit animations use opacity + vertical slide
- Worklet-driven scrubbing mode for zero-latency UI thread updates (Skia only)

### Character keying strategy
- Integer digits keyed RTL: `integer:0` (ones), `integer:1` (tens), etc.
- Fraction digits keyed LTR: `fraction:0` (tenths), etc.
- This ensures correct React reconciliation when digit count changes

## Package exports
- `.` (default) - All components
- `./skia` - Skia components only
- `./native` - Native/View components only

## Dependencies
- **Required peers:** react >= 18, react-native >= 0.73, react-native-reanimated >= 3.0.0
- **Optional peer:** @shopify/react-native-skia >= 2.0.0

## Instructions
- NEVER assume anything without checking either web or source code.
- Prefer looking into source code for libraries to solve problems related to them.
- NEVER add Co-Authored-By or any self-attribution in git commits.
- NEVER revert files via Git commands (`git checkout`, `git restore`, `git reset`, `git stash`). If you need to undo changes, edit the files manually.
- Always use `bunx` instead of `npx` for running commands (e.g. `bunx expo install`, `bunx tsc`).
- When a prop is passed directly to a React Native component (e.g. `<Text style={textStyle}>`), type it using that component's actual prop type (e.g. `TextStyle`), not a narrow subset. Only narrow the type at the public API boundary where you need to enforce required fields.
- When changing the public API (props, types, exports), always update the documentation (README.md, docs site, JSDoc) to match.
- Write functions that are visually appealing: use blank lines to separate logical sections, prefer early-return guard clauses, extract predicates into named variables for readability.
- Never call functions or access methods inline in JSX props. Extract computed values into named local variables before the return statement.
- Don't add unnecessary fallback values when the types already handle it (e.g. `x || undefined` when `x` is already `boolean | undefined`, or `x ?? defaultValue` when the consumer already handles falsy cases).
- Never write comments that only make sense in the context of a specific debugging session or conversation. Comments should explain *why* the code is the way it is for future readers, not narrate what happened during development.
