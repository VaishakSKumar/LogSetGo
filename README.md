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
| Storage | AsyncStorage, one JSON document per store. Photos are files on the device. |
| Form videos | `react-native-webview`, or an iframe on web |
| Native features | Haptics, notifications, keep-awake, camera, file picker, sharing |
| Web | Installable PWA with a service worker (`public/sw.js`) |
| Tests | Node test runner through `tsx` for logic, Jest and Testing Library for screens |
| Builds | EAS for Android and iOS, GitHub Actions and GitHub Pages for web |

---

## 3. Commands

| Command | What it does |
|---|---|
| `npm run web` | Start the web version |
| `npm run typecheck` | Type check |
| `npm test` | Logic tests (138) |
| `npm run qa:ui` | Screen tests (34), run one at a time |
| `npm run qa:bundle` | Check the iOS and Android bundles compile |
| `npm run qa:gate` | Types, logic, screen tests, bundles and web build |
| `npm run build:web` | Build the web app into `dist/` |
| `npm run preview:web` | Serve `dist/` locally |
| `npm run icons` | Regenerate icons from the logo |
| `npm run build:apk:local` | Build a release APK on this computer |
| `npm run version:bump` | Bump the version in `app.json` and `package.json` |

---

## 4. Project structure

```
App.tsx                  Providers, tab shell, Android back button
index.ts                 Entry point
src/
  screens/               CalendarScreen, WorkoutScreen, AccountScreen
    account/             BMI, Gym Attendance and Weight Progress pages
  components/            Shared UI: search, set table, dock, rest banner, charts
    attendance/          Calendar popup, status sheet, day status buttons
    body/                Weight and height sheets, weight history
    plans/               New workout plan flow: choose, info, build, import
    session/             Recorder drawer, summary card, exercise cards, swipe-to-delete
    sheets/              Settings, routines, stats, tools, goals, set details, day names
  store/                 Providers: gym, attendance, body, photos, timer
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
| `minimalist-gym-tracker/photos/v1` | Monthly photo records by date. Files are in `monthly-photos/`, or IndexedDB on web. Not in backups. |

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
- **Checking a set opens `RestOverlay`** over the recorder when auto-start is on. New installs default to 60 seconds (`DEFAULT_REST_SECONDS`), and the saved Default rest wins on existing installs.
- **`MonthlyPhotoGate` locks today's workout** until this calendar month has a saved photo. It sits inside `PresenceGate` in `App.tsx`.
- **Form media order:** `localMedia`, then `youtubeUrl`, then a link the user pasted (`AppData.exerciseVideos`). Cues come from `src/data/formCues.ts`.

### Exercise list

`src/data/exercises.generated.ts` comes from [exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset). To regenerate it, download that repo's `exercises.json` and run:

```bash
node scripts/import-exercises.js path/to/exercises.json
```

Only names, body parts and equipment are used. The dataset's images and videos are © Gym visual and are not covered by its MIT licence, so **do not add them to the app**. Exercises already in `catalog.ts` are skipped by the import, which keeps existing ids stable.

---

## 7. Redesign work

The app is built to the approved **[LogSetGo Redesign canvas](https://claude.ai/artifact/AuRoVLBUuY4jBTVCh9Za9c)**. The owner must share the link with you, because it is private by default. When the app and a board disagree on looks, the board wins.

Every board below is built except the mobile number and OTP login. The Settings, Routines, Stats and Tools sheets have no boards; they use the same colours and fonts.

| Canvas board | Screen | Notes |
|---|---|---|
| Dashboard, DashboardPunched | Attendance tab | Punch In / Start Workout card, weekly capsule streak |
| Calendar, CalendarMonthly | Attendance popup | Opened from the streak count. Weekly and Monthly views. |
| GymStart | Gym Progress day view | Swipe between dates. Tap the date for the calendar. |
| GymRecorder, GymProgress | Recorder and logged day | The recorder merges GymRecorder and GymSession into one drawer |
| GymSession, GymSessionRest, GymSessionAdd, GymSessionVideo | Active workout session | Form media, cues, set table, 60-second rest overlay |
| GymLocked, GymHoliday, GymNotMarked | Full-screen Absent, Holiday and not-marked states | `PresenceGate` for today, `WorkoutScreen` for other dates |
| MonthlyCheckin | Monthly check-in | Not forced. Skip for now, or add it any time from Account. One photo a month. |
| Account, AccountPhoto | Account tab | Replaces BMI & Weight. No login. |
| BMI | BMI page | Target goal weight, 30 to 300 kg |
| StatsAttendance | Gym Attendance page | Tap the "days done" pill to change the weekly goal (1 to 7, default 5) |
| StatsWeight | Weight Progress page | Weight history lives here too |
| PlanNew, PlanInfo, PlanInfoFile, PlanBuilder, PlanImport, PlanImportReview | New workout plan | The + on Gym Progress. Files: .xlsx, CSV, .txt up to 2 MB. Old .xls files get a message asking for .xlsx. |
| GymSession (Week by week) | Graph below Add set | Best set each week. Banana-yellow PR dot when a week beats every earlier one. |
| Accounts page: Main, Otp | Mobile number and OTP login | **Do not build yet.** Accounts come after the beta test. |

Agreed product decisions:

- One-tap Present, Absent and Holiday buttons. **Absent is never set automatically.**
- Past dates can have their status changed, and attendance updates with it.
- Absent and Holiday are full-colour screens with no empty space. Holiday is yellow, Absent is red.
- If an exercise has no media, the user can paste a YouTube link that plays in the app, or upload a GIF or image.
- A saved plan is planned, not done. Tapping it fills in the exercises, sets and reps. Only ticked sets count toward volume, stats and PRs.
- Uploads allow GIF, JPG, PNG and WebP only, up to 10 MB. PDF, DOCX and everything else are rejected, and the formats are shown on screen.

Things to plan for:

- **Accent colour:** the canvas uses `#3DFF6E`, the app uses `#30D158` (`src/theme.ts`).
- **Exercise media:** no bundled clips or YouTube links ship with the catalogue yet, so users paste their own. GIF and image upload for form media is not built.
- **Mockup limits:** some canvas buttons are not wired and tabs don't share state between boards. Treat them as visual references.

Open decisions, to be confirmed with the owner before building:

1. Does the recorder drawer merge into the active session screen?
2. Can sets be logged on past days? Today the app does not allow it.
3. Should the app warn before changing the status of a day with a saved workout?

---

## 8. Release

1. Run `npm run qa:gate`.
2. Run `npm run version:bump`. The version goes 1.0.1 to 1.0.9, then 1.1.0.
3. Build or deploy.

**Web:** every push to `main` type-checks, runs the tests, builds and publishes to <https://vaishakskumar.github.io/LogSetGo/> through `.github/workflows/deploy-web.yml`. A failed test stops the deploy.

**Android APK on this computer:** needs JDK 17 and the Android SDK. Gradle fetches missing SDK parts on the first run. If the SDK isn't in the default location, set `ANDROID_HOME`.

```bash
npm run build:apk:local
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`. `android/` is generated and git-ignored, so make native changes in `app.json` or `plugins/`, never by hand. The release build uses the template's debug signing key, which is fine for testing but not for the Play Store. Android will not install it over a build signed with a different key, so uninstall the old app first. That erases its data unless you export a backup.

**Android APK from Expo's cloud:**

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
| Bodyweight days show 0 kg | Today's workout and This week show 0 kg of volume on no-weight days. |
| "Logging" chip on past dates | The chip says "Logging <date>" although past dates are read-only. |
| Some imported body parts are wrong | The source data has errors, for example Pike-To-Cobra Push-Up is under Legs. |
| Not verified on devices | Haptics, notifications, camera, YouTube playback, the Android keyboard and the full exercise list have not been fully checked on real phones. |
