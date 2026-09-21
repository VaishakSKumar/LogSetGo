---
name: react-native-qa-validation
description: Runs the 5-tier QA gate (Unit, Integration, System, SIT, UAT) for this Expo / React Native / NativeWind v4 / Reanimated 4 app before any branch commit or deployment. Runs what is configured today (typecheck, logic tests, iOS + Android bundle check), reports the rest as NOT CONFIGURED, and blocks the commit if any configured tier fails.
version: 1.1.0
stack:
  - React Native 0.86 (Expo SDK 57)
  - NativeWind v4
  - React Native Reanimated 4
  - node:test via tsx (Tier 1, live today)
  - Jest & React Native Testing Library (Tiers 2-3, not yet installed)
  - Maestro (Tier 5, not yet installed)
---

# React Native 5-Tier QA Skill Pipeline

An automated quality gate. Run it before committing, opening a PR, or deploying.

**Rules**

1. Run tiers in order. **If any configured tier fails, abort the commit/deployment immediately** and show the failing output.
2. **Never report a tier as passed unless it actually ran.** A tier with no tooling is `NOT CONFIGURED`, which is not a pass. State this plainly in the summary.
3. Never bypass the gate (`--no-verify`, editing tests to pass, skipping a tier) to get a commit through.

## Tier status for this project

| Tier | What it proves | Status | Command |
|---|---|---|---|
| 1 Unit | Pure logic + types | **Live** | `npm run qa:types` and `npm run qa:unit` |
| 2 Integration | Screen-level component behavior | NOT CONFIGURED | needs Jest + RNTL (see below) |
| 3 System | Whole flows + persistence | Partial: reducer/store flows are in Tier 1 tests; UI flows are a manual/agent check | see Tier 3 |
| 4 SIT | Compiles as real native apps and an installable web app; bridges fail safe | **Live** (bundle + web build) | `npm run qa:bundle` and `npm run qa:web` |
| 5 UAT | End-to-end journey + design bar | NOT CONFIGURED (Maestro); manual checklist available | see Tier 5 |

**Master command** (the live tiers):

```bash
npm run qa:gate      # qa:types -> qa:unit -> qa:bundle -> qa:web; exit code 0 = live tiers pass
```

`qa:gate` passing certifies **only** the live tiers. Say so; do not describe the change as "fully QA'd".

---

## Pre-flight

```bash
git status --short          # know what you're about to commit
ls .env.local 2>/dev/null   # if present, delete it first (see hygiene below)
```

**Hygiene:** `.env.local` (containing `EXPO_PUBLIC_DEMO=1`) is only for local demo data. Delete it before committing or running the gate, since it changes app behavior.

---

## Tier 1: Unit Testing (UT). LIVE

**Objective:** verify pure functions, state logic, and math with no UI: BMI engine and category boundaries, rest-timer engine, attendance streak/rate, progressive-overload suggestions, calendar grid, the workout reducer, search ranking.

```bash
npm run qa:types    # tsc --noEmit (strict)
npm run qa:unit     # node:test suite: src/lib/logic.test.ts
```

**Audit checklist**

* [ ] Typecheck is clean (no `any` escapes added to dodge errors).
* [ ] Every new pure function in `src/lib/` or `src/store/reducer.ts` has tests for edge cases: null / empty / zero, boundaries (e.g. BMI 18.5, 24.96, 30), and invalid input.
* [ ] New behavior added a test; a bug fix added a regression test that fails without the fix.
* [ ] Timestamp-based logic (timer, streaks) is tested with injected `now`, never real clocks.

## Tier 2: Integration Testing (IT). NOT CONFIGURED

**Objective:** component interaction: typing a weight updates the BMI gauge, tapping a preset starts the timer, tapping the check locks a row.

Requires installing Jest + `@testing-library/react-native`. When you set it up, note that **Reanimated 4 has no `src/reanimated2/jestUtils`**. Use what the installed version exports:

```javascript
// jest.setup.js
import { setUpTests } from 'react-native-reanimated';
setUpTests();

// or, to fully stub animations:
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
```

Verify the `react-native-worklets` mock requirement against the installed version, and mock `expo-haptics` and `@react-native-async-storage/async-storage` (the official async-storage jest mock). Prefer real NativeWind class output over mocking `nativewind` away, so style regressions are catchable.

* Tests live in `src/__tests__/integration/`, script `qa:integration`.
* Use `withReanimatedTimer` / `advanceAnimationByTime` to assert animation results instead of sleeping.

Until then: **report Tier 2 as NOT CONFIGURED.**

## Tier 3: System Testing (ST). PARTIAL

**Objective:** whole features and data flows: Attendance → Present → Gym Progress on that date; set logged → rest timer auto-starts → green to yellow at 10 s → 0:00; weight logged → BMI updates → survives reload.

* **Covered by Tier 1:** the reducer and store transitions, timer engine, attendance resolution, body/BMI maths.
* **Not automated:** UI flows and AsyncStorage rehydration. For changes touching them, drive the app in the browser preview and verify the flow by hand:

```bash
echo "EXPO_PUBLIC_DEMO=1" > .env.local   # seeds demo history on first launch
npx expo start --web --port 8081          # open at a 390x844 viewport
# ... exercise the flow, reload the page to check persistence ...
rm .env.local                             # always remove afterwards
```

**Audit checklist**

* [ ] Flow completes with no console errors or unhandled promise rejections.
* [ ] Data survives a page reload (sets, attendance marks, timers, weight/height).
* [ ] Logging a set, then undoing it, leaves state consistent (no stray PR flags or timers).
* [ ] Rapid taps don't race (double-log, double-start of the timer).

Report Tier 3 as *"unit-level flows covered; UI flows verified manually"* or *"not verified"* honestly.

## Tier 4: System Integration Testing (SIT). LIVE

**Objective:** the app compiles into real native bundles and native bridges fail safe.

```bash
npm run qa:bundle   # expo export for ios + android (Hermes), then cleans up
npm run qa:web      # PWA build: manifest, icons, service worker precache, sanity checks
```

**Audit checklist**

* [ ] Both platform bundles build (this catches native-only import/syntax issues the web preview hides).
* [ ] The web build succeeds and its own checks pass (manifest, all icons, JS bundle, service worker version filled in).
* [ ] Every native module call is guarded: `expo-haptics` and `Vibration` go through `src/lib/haptics.ts` (web no-op, `try/catch`); keep-awake and AsyncStorage calls `.catch(() => {})`.
* [ ] No new dependency was added without `npx expo install` (SDK-compatible versions).
* [ ] Layout respects safe areas: top inset handled once by `TopTabBar`, bottom inset by docks and scroll padding.

Not covered: real-device haptics, Android keyboard handling, and iOS `ui-rounded` font. Say these are untested unless you tested on a device.

## Tier 5: User Acceptance Testing (UAT). NOT CONFIGURED (Maestro)

**Objective:** the real user journey plus the design bar. Maestro is not installed; the spec below is a corrected template, **unverified until Maestro is set up**.

```yaml
# .maestro/uat-user-flow.yaml
appId: com.vaishakskumar.logsetgo
---
- launchApp
- assertVisible: "Attendance"
- assertVisible: "Showed up"
- tapOn: "Gym Progress"
- assertVisible: "Rest timer"
- tapOn: "0:30"
- assertVisible: "0:(30|29)"
- tapOn: "BMI & Weight"
- assertVisible: "Update weight"
```

**Manual UI acceptance checklist** (use until Maestro exists)

* [ ] Background is true black `#000000`; cards `#1C1C1E`; accent `#30D158` only for log/active/positive states.
* [ ] Type scale respected: 34 display / 28 H1 / 17 H2 / 20 numbers / 15 body / 12 caption.
* [ ] Touch targets are at least 44×44 pt; spacing follows the 8 pt rhythm.
* [ ] Tabs, sheets and state changes animate in about 250 ms ease-out; no visible jank.
* [ ] Status colors match spec: Present `#30D158`, Absent `#FF453A`, Holiday `#FFD60A`, BMI Normal `#30D158`, BMI out-of-range and delete actions `#FF453A`, timer warning (final 10 s) `#FFD60A`.

---

## Pre-commit enforcement

Scripts already in `package.json`:

```json
"qa:types":  "tsc --noEmit",
"qa:unit":   "npm test",
"qa:bundle": "node scripts/qa-bundle.js",
"qa:web":    "node scripts/build-web.js",
"qa:gate":   "npm run qa:types && npm run qa:unit && npm run qa:bundle && npm run qa:web"
```

When Tiers 2 / 3 / 5 are set up, add `qa:integration`, `qa:system`, `qa:uat` and extend `qa:gate` in tier order.

## Execution protocol

1. Run `npm run qa:gate`.
2. **Exit 0:** report *"Live tiers pass (types, unit, iOS + Android bundle, web build)"*, then list each unconfigured or manual tier by name with its status. The change may be committed.
3. **Non-zero:** stop. Show the failing tier's output, fix the cause (not the test), and rerun from Tier 1.
4. Never commit with a failing configured tier, and never describe `NOT CONFIGURED` tiers as passed.
