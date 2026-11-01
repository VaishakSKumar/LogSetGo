# LogSetGo

**Track. Rest. Progress.**

LogSetGo is a true-black, offline gym logger for Android, iPhone and the web. It covers workout logging, a rest timer that starts itself, daily attendance, and body weight and BMI.

There is no server and no account. All data stays on the device.

| Document | Who it is for |
|---|---|
| This README | Developers: setup, architecture, rules, release, redesign work |
| [docs/QA-TEST-GUIDE.md](docs/QA-TEST-GUIDE.md) | QA: every feature, expected behaviour and test cases |
| [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) | Installing, and sharing builds with testers |
| [docs/STORE-LISTING.md](docs/STORE-LISTING.md) | Store listing text |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | Licence notices |

---

## 1. Quick start

You need [Node.js](https://nodejs.org) 22 (the version CI uses) and Git.

```bash
git clone https://github.com/VaishakSKumar/LogSetGo.git
```

```bash
cd LogSetGo
```

```bash
npm install
```

```bash
npx expo start
```

In the Expo terminal:

| Press | Result | Needs |
|---|---|---|
| `w` | Opens in the browser. Resize to phone width. | Nothing else |
| `a` | Android emulator | Android Studio and a virtual device |
| `i` | iOS simulator | A Mac with Xcode |
| Scan the QR code | Real phone in Expo Go | Same Wi-Fi. Expo Go must support SDK 57. |

If Expo Go rejects the project, use the web build or an EAS APK (section 8).

### Demo data

Create `.env.local` in the project root with this line:

```
EXPO_PUBLIC_DEMO=1
```

Restart Expo. On a first launch with nothing stored, the app seeds five weeks of workouts, attendance and body weight. Delete the file for a clean app, and clear the browser's site data if the app has already run there. `.env.local` is git-ignored and must stay that way.

---

## 2. Stack

| Area | Choice |
|---|---|
| App framework | Expo SDK 57, React Native 0.86, React 19 |
| Language | TypeScript |
| Styling | NativeWind v4 and Tailwind 3. Tokens are in `tailwind.config.js` and `src/theme.ts`. |
| Animation | Reanimated 4 |
| Storage | AsyncStorage, one JSON document per store |
| Native features | Haptics, notifications, keep-awake, file picker, sharing |
| Web | Installable PWA with a service worker (`public/sw.js`) |
| Tests | Node test runner through `tsx` for logic, Jest and Testing Library for screens |
| Builds | EAS for Android and iOS, GitHub Actions and GitHub Pages for web |

---

## 3. Commands

| Command | What it does |
|---|---|
| `npm run web` | Start the web version |
| `npm run typecheck` | Type check |
| `npm test` | Logic tests (133) |
| `npm run qa:ui` | Screen tests (29) |
| `npm run qa:bundle` | Check the iOS and Android bundles compile |
| `npm run qa:gate` | Types, logic, screen tests, bundles and web build |
| `npm run build:web` | Build the web app into `dist/` |
| `npm run preview:web` | Serve `dist/` locally |
| `npm run icons` | Regenerate icons from the logo |
| `npm run version:bump` | Bump the version in `app.json` and `package.json` |

If screen tests time out on a slower machine, run them one at a time:

```bash
npx jest --silent -i
```

---

## 4. Project structure

```
App.tsx                  Providers, tab shell, Android back button
index.ts                 Entry point
src/
  screens/               CalendarScreen, WorkoutScreen, BodyScreen
  components/            Shared UI: search, set table, dock, rest banner, charts
    attendance/          Date tile, status sheet, analytics card
    body/                Weight hero, BMI gauge, weight and height sheets
    session/             Recorder drawer, summary card, exercise cards, swipe-to-delete
    sheets/              Settings, routines, stats, tools, goals, set details, day names
  store/                 Providers: gym, attendance, body, timer
    reducer.ts           Pure workout state changes
  lib/                   Pure logic, most of it tested
  data/
    catalog.ts           Hand-written exercises (106)
    exercises.generated.ts   Imported exercises (1,040). Do not edit by hand.
  __tests__/             Screen tests
scripts/                 Build, icon, version and exercise-import scripts
public/                  PWA manifest, service worker, icons, privacy page
.github/workflows/       Web deploy
```

Key files in `src/lib`:

| File | Responsibility |
|---|---|
| `progress.ts` | History, grey suggestions, PR maths, overload rules, weekly totals, `resolveSet`, `loadOf` |
| `session.ts` | Day feed, day summary, volume, time under tension, "last time" text |
| `search.ts` | Exercise ranking and ghost completion |
| `suggest.ts` | The list shown before anything is typed |
| `attendance.ts` | Statuses, streak, rate, `canLog` |
| `backup.ts`, `appdata.ts` | Backup, restore, merge, CSV, data clean-up on load |
| `timer.ts` | Rest timer engine |
| `body.ts` | BMI, categories, height, limits |
| `routines.ts`, `stats.ts`, `calc.ts` | Plan builder, charts and records, gym calculators |
| `notify.ts`, `files.ts`, `diagnostics.ts` | Native-facing helpers, safe no-ops on web |

---

## 5. Data model

Everything is on-device, under these AsyncStorage keys:

| Key | Contents |
|---|---|
| `minimalist-gym-tracker/v1` | Workouts: sessions, routines, goals, custom exercises, preferences |
| `minimalist-gym-tracker/attendance/v1` | Attendance marks by date |
| `minimalist-gym-tracker/body/v1` | Height and weight entries |
| `minimalist-gym-tracker/timer/v1` | Timer settings and saved timers |

Types are in `src/types.ts`. Do not break these rules:

- **Weight is always stored in kg.** Convert only at the display edge, so kg/lb switching never changes data.
- **`weight: 0` means no added weight.** It is a valid logged set. `null` means the box is still empty.
- **`SetRow.reps` holds seconds when `mode` is `'time'`.** Time sets never count toward volume, e1RM or weight PRs.
- **Warm-ups never count** toward volume, PRs, history or suggestions.
- **Exercise ids must never change.** Sessions are keyed by id, so a rename that changes the slug orphans the user's history.
- **Dates are local `YYYY-MM-DD` strings.** Use the helpers in `src/lib/dates.ts`.
- **Stored data must keep loading.** `appdata.ts` normalises old data, so add fields as optional with a safe default.

---

## 6. Core behaviour for developers

- **Only today can be logged.** `canWrite` in `WorkoutScreen.tsx` allows it only when the viewed date is today. Past dates are read-only and future dates are empty.
- **Logging today needs Present.** `PresenceGate` blocks Gym Progress until today is explicitly marked Present.
- **A kg box can be blank.** `resolveSet` uses the typed value, then the grey suggestion, then 0. Only reps or time are required.
- **The kg box depends on the exercise.** `loadOf` returns `kg` (normal), `extra` (bodyweight, shown as +kg) or `none` (group Cardio, hidden).
- **Sets save when checked,** not on Done. Done only confirms and returns to the summary.
- **Tabs stay mounted** after their first visit, so state survives switching.
- **The rest timer is timestamp-based,** so it stays accurate in the background.

### Exercise list

`src/data/exercises.generated.ts` comes from [exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset). To regenerate it, download that repo's `exercises.json` and run:

```bash
node scripts/import-exercises.js path/to/exercises.json
```

Only names, body parts and equipment are used. The dataset's images and videos are © Gym visual and are not covered by its MIT licence, so **do not add them to the app**. Exercises already in `catalog.ts` are skipped by the import, which keeps existing ids stable.

---

## 7. Redesign work

The next piece of work is a full redesign. The mockups are on the **[LogSetGo Redesign canvas](https://claude.ai/artifact/AuRoVLBUuY4jBTVCh9Za9c)**. **None of it is built yet.** The owner must share the link with you, because it is private by default.

| Canvas board | Screen | Notes |
|---|---|---|
| Dashboard, DashboardPunched | New home screen | Punch In / Start Workout card, weekly capsule streak |
| Calendar, CalendarMonthly | Attendance popup | Opened from the streak count. Weekly and Monthly views. |
| GymStart | Gym Progress day view | Swipe between dates. Tap the date for the calendar. |
| GymRecorder, GymProgress | Recorder and logged day | Evolves the current drawer and feed |
| GymSession, GymSessionRest, GymSessionAdd, GymSessionVideo | Active workout session | Form media, cues, set table, 60-second rest overlay |
| GymLocked, GymHoliday, GymNotMarked | Full-screen Absent, Holiday and not-marked states | Replaces the current lock screen |
| Accounts page: Main, Otp | Mobile number and OTP login | **Do not build yet.** Accounts come after the beta test. |

Agreed product decisions:

- One-tap Present, Absent and Holiday buttons. **Absent is never set automatically.**
- Past dates can have their status changed, and attendance updates with it.
- Absent and Holiday are full-colour screens with no empty space. Holiday is yellow, Absent is red.
- If an exercise has no media, the user can paste a YouTube link that plays in the app, or upload a GIF or image.
- Uploads allow GIF, JPG, PNG and WebP only, up to 10 MB. PDF, DOCX and everything else are rejected, and the formats are shown on screen.

Things to plan for:

- **Accent colour:** the canvas uses `#3DFF6E`, the app uses `#30D158` (`src/theme.ts`).
- **YouTube playback:** the app has no embedded web view today, so this needs a new dependency. Build it for Android, iOS and web, and check it in a real build.
- **Uploaded media:** there is no file storage yet, and the current backup format doesn't cover media.
- **Mockup limits:** some canvas buttons are not wired and tabs don't share state between boards. Treat them as visual references.

Open decisions, to be confirmed with the owner before building:

1. Does the recorder drawer merge into the active session screen?
2. Can sets be logged on past days? Today the app does not allow it.
3. Should the app warn before changing the status of a day with a saved workout?
4. What is the BMI & Weight redesign? It has not been designed yet.

---

## 8. Release

1. Run `npm run qa:gate`.
2. Run `npm run version:bump`. The version goes 1.0.1 to 1.0.9, then 1.1.0.
3. Build or deploy.

**Web:** every push to `main` type-checks, runs the tests, builds and publishes to <https://vaishakskumar.github.io/LogSetGo/> through `.github/workflows/deploy-web.yml`. A failed test stops the deploy.

**Android test APK:**

```bash
npx eas-cli build --platform android --profile preview
```

**iPhone and store builds:** see [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md). EAS and store access use the owner's accounts, so ask them for access. Never commit credentials.

---

## 9. Working agreement

- Branch from `main` and open a pull request. Pushing to `main` deploys to live users.
- Run the type check and tests before each pull request, and add tests for new logic.
- Keep pure logic in `src/lib`, and state changes in `src/store/reducer.ts`.
- Keep touch targets at 44 pt or larger, and give interactive elements accessibility labels. The screen tests rely on them.
- Use the colour and type tokens instead of hard-coded values.
- Keep the app working offline, with no data leaving the device.

---

## 10. Known issues

| Issue | Detail |
|---|---|
| 3 screen tests are date-dependent | `attendance.test.tsx` (2) and `gate.test.tsx` (1) fail on some dates, for example Sunday 1 Nov 2026. The date-label pattern also matches later tiles such as "Sunday, November 15". The app itself is fine, but CI runs these tests, so a failure blocks the web deploy. Fix the pattern first. |
| Parallel Jest is slow on some machines | It can time out. Use `npx jest --silent -i`. |
| Bodyweight days show 0 kg | Today's workout and This week show 0 kg of volume on no-weight days. |
| "Logging" chip on past dates | The chip says "Logging <date>" although past dates are read-only. |
| Some imported body parts are wrong | The source data has errors, for example Pike-To-Cobra Push-Up is under Legs. |
| Not verified on devices | Haptics, notifications, the Android keyboard and the full exercise list have not been fully checked on real phones. |
