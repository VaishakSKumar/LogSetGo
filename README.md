# LogSetGo

**Track. Rest. Progress.**

A distraction-free athletic utility for the gym floor: frictionless workout logging, a rest timer that starts itself, daily attendance, and body-weight / BMI tracking in one True-Black OLED interface. Built with Expo (SDK 57), React Native, NativeWind v4, and Reanimated.

```bash
npm install
npx expo start          # press i / a, or scan the QR code in Expo Go
npm run web             # quick look in a browser
npm test                # logic tests (search, autofill, overload, weekly maths, reducer, backup, plans, stats…)
npm run qa:ui           # UI tests: Jest + Testing Library drive the real screens
npm run qa:gate         # everything: types, logic, UI, iOS + Android + web builds
npm run typecheck
```

**New here?** See [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) for install steps and how to share the app with friends on iPhone and Android.

**Web app:** the web version is an installable, offline-capable PWA, published to GitHub Pages on every push to `main`. Setup and how friends install it: [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md#route-a-web-app-link-iphone--android-free).

**Try it with history:** create `.env.local` containing `EXPO_PUBLIC_DEMO=1`. On first launch (nothing stored yet) it seeds five weeks of push/pull/legs sessions. Delete the file to start clean.

## What you get

| Spec item | How it works |
|---|---|
| Autofill search | Tap the pill: recents show instantly (today's split first), each with your last `weight × reps`. Type `in` and the grey ghost completes `Incline Dumbbell Press`; Return or tap accepts. Ranking favors exercises you actually train. Unknown names offer *Add "…"*. |
| Grey autofill | Every row is pre-seeded from last session's matching set. **Tap a grey box to accept it**, or tap the check to log the grey values as-is. If you change weight mid-exercise, later sets follow you. |
| Set row | Right-aligned rounded figures, 44pt targets, glass row → filled row on log, locked numbers, tap the check again to undo. |
| Steppers | Thumb-zone dock: `−/+` for weight (2.5 kg / 5 lb) and reps, plus one big **Log set N** button. |
| Weekly card | Volume vs the same days last week, progress toward last week's total, sets, workouts. Updates the instant you log. |
| Remembers everything | All sets persist locally (AsyncStorage). Nothing is ever overwritten; weights are stored in kg so kg/lb switching never drifts. |
| Progress help | Per exercise: best set, est. 1RM, trend line, gain since first log, full **History** sheet, `PR` on new records, and a **Try today** target with a plain-English reason. |

### Navigation
A three-tab bar sits at the top of every screen:

| Tab | Contents |
|---|---|
| **Attendance** | Calendar, P / A / H status, showing-up stats, daily-flow routing. The app opens here. |
| **Gym Progress** | Exercise logger, set/rep counter, autofill box, rest timer. **Open only when the date is Present**; otherwise it shows a lock screen with a button to Attendance. |
| **BMI & Weight** | Weight log, height, BMI gauge, progress trend. |

Tabs mount when first opened and then stay alive, so scroll position, the calendar month and an open search survive switching. A running rest timer stays docked on every tab. On Android, the back button returns to Attendance before it exits the app.

### Backup, records and more
| Feature | What it does |
|---|---|
| **Settings** (the sliders button, top right) | Units, weight step (1 / 1.25 / 2.5 / 5 kg or 2.5 / 5 / 10 lb), notifications, backup, diagnostics. |
| **Backup & restore** | Export everything as one JSON file; import it on any device. **Merge** adds what's missing and never overwrites your data; **Replace** restores exactly what's in the file. Bad or newer files give a readable error and change nothing. |
| **CSV export** | Every logged set, and the weight log, ready for a spreadsheet. |
| **Routines** | Save a workout and start it in one tap: rows for every exercise, first one selected. Saving under an existing name updates it. |
| **Plan builder** | Pick goal (strength / muscle / endurance), days (2–6) and level, and it lays out Full Body, Upper/Lower or Push/Pull/Legs with sensible sets and reps. Fixed rules, works offline. It is not AI. |
| **Stats & records** | Weekly volume chart (4/12/26 weeks), muscle balance, strength trend per lift, and every personal record. Each chart has a "Show data" table. |
| **Workout summary** | Duration, volume, sets, PRs, top set per exercise, and the change vs your last workout of the same name. |
| **Goals** | "Lift 100 kg" per exercise, with progress, a pace estimate from your last sessions (needs 3+ sessions over a week), and milestones. |
| **Tools** | 1RM with a percentage table, plate calculator (kg and lb), and a warm-up ramp. |
| **Set details** | Tap a set number: mark a **warm-up** (never counts toward volume, PRs, history or suggestions), record **RPE**, add a note. Exercise notes live on the goal card. |
| **Custom exercises** | Choose a muscle group when you add one, so it shows in muscle balance. |
| **Notifications** (iOS / Android apps) | A buzz when a rest ends with the app closed, and an optional daily reminder. The web version can't notify while closed. |
| **Diagnostics** | Errors are kept on the device (last 20) and shown in Settings; share them if something breaks. Nothing is sent automatically. A crash shows a recovery screen instead of a blank one. |

### BMI & Weight
- **Weight is stored, not asked for.** Your latest weight stays put until you log a new one. Nothing prompts you daily. Every entry keeps its date and time.
- **Update weight** sheet: type on the keypad or use the `−1 −0.1 +0.1 +1` steppers (hold to repeat). A live preview shows the change since your last entry and the resulting BMI before you save. Saving stamps the time and fires a light haptic. The kg/lb switch lives in the sheet.
- **Height:** set once, edit anytime, in cm or ft/in. BMI recalculates the moment weight or height changes.
- **BMI** = kg ÷ m², classified on the one-decimal value shown, so 24.96 reads "25.0 · Overweight".

  | Range | Category | Color |
  |---|---|---|
  | < 18.5 | Underweight | Red `#FF453A` |
  | 18.5 – 24.9 | Normal Weight | Green `#30D158` |
  | 25.0 – 29.9 | Overweight | Red `#FF453A` |
  | ≥ 30.0 | Obese | Red `#FF453A` |

- **Gauge:** four proportional segments, your band at full color, and a marker that glides to your exact BMI.
- **Change colors:** the change is colored by what it does to your band, not by direction. Moving toward Normal is green, drifting further out is red, and staying within a band is neutral grey. Losing weight is not automatically "good".
- **History:** newest first, with time, weight, change, and BMI. Tap **Edit** to delete a mistaken entry. The **Progress** card shows the trend, total change, lowest and highest.

### Attendance & daily flow
The app opens on a calendar. Tap any date and pick a status:

| Choice | What happens |
|---|---|
| **Present** (`#30D158`, badge `P`) | Marks the date and jumps to the Gym Progress tab, pointed at that date. |
| **Absent** (`#FF453A`, badge `A`) | Marks the date, updates the metrics, stays on the calendar. |
| **Holiday** (`#FFD60A`, badge `H`) | Marks the date, updates the metrics, stays on the calendar. |

- **Summary card:** days showed up, current streak, and attendance rate. It recomputes instantly.
- **Rate** = present ÷ (present + absent). Holidays are excused and left out of the denominator. To count them instead, flip `COUNT_HOLIDAYS_IN_RATE` in `src/lib/attendance.ts`.
- **Streak** = consecutive present days ending today. A Holiday pauses it, and an Absent or an unmarked past day breaks it. Today only counts once it's Present, and it doesn't break the streak while it's still unmarked.
- **Gym Progress is gated by Present.** The logger opens only when the date you're logging is Present. Unmarked, Absent and Holiday dates show a lock screen. Marking a past date Present unlocks it for back-filling. If you mark a day Absent after logging on it, the logger closes but nothing is deleted; mark it Present again to get back in.
- **Derived presence:** a day with logged sets shows as Present even if you never tapped it, so training history is never invisible. Your explicit mark always wins.
- **Future dates** can only be marked Holiday.
- **Back-filling:** you can open a past date's workout to log it. Rest-timer auto-start only fires when logging today.
- While logging a date other than today, Gym Progress shows a **Jump to today** chip.

### Rest timer
| Piece | Behavior |
|---|---|
| Presets | `0:30` `1:00` `1:30` `2:00`, one tap to start. |
| Custom timer | Expand **Custom timer**: −/+ for minutes and seconds (hold to repeat, seconds move in 5s steps), optional name, **Add to Dashboard**. |
| Saved timers | Listed with one-tap start and a delete button. Persisted on the device (up to 20). |
| Auto-start | Switch on the card. Completing a set (any checkmark or the Log button) starts the **Default rest**, which you pick from presets or your saved timers. Undoing a set does not start it. |
| Countdown banner | Docks above the Log button: 34pt bold rounded digits, progress bar, `+15s`, Pause/Resume, Skip. Green while running, yellow (`#FFD60A`) for the last 10 s, grey when paused. At `0:00` it pulses, fires a strong haptic (plus vibration on Android), shows "Rest over", and clears itself after 6 s. |

The countdown is timestamp-based, so it stays accurate if the app is backgrounded, and the screen stays awake while it runs. There are no background notifications yet, so keep the app open during rest.

### Progressive-overload rule
Applied to your heaviest sets from last session:
- every set ≥ 12 reps → add a plate jump, restart at 8
- all sets equal, ≤ 6 reps → add a plate jump
- all sets equal, 7–11 reps → +1 rep per set
- uneven sets → bring every set up to your best one

Warm-up sets are left alone. Tap **Use** to apply.

## Structure

```
App.tsx                     providers + tab router
src/screens/                CalendarScreen, WorkoutScreen, BodyScreen
src/lib/body.ts             BMI, categories, height, gauge geometry (tested)
src/store/body.tsx          persisted weight log + height
src/components/body/        HeroCard, BmiGauge, UpdateWeightSheet, HeightSheet, …
src/components/TopTabBar.tsx
src/lib/attendance.ts       statuses, streak, rate (tested)
src/lib/calendar.ts         month matrix helpers (tested)
src/store/attendance.tsx    persisted attendance marks + derived stats
src/components/attendance/  DateTile, StatusSheet, AnalyticsCard
src/store/reducer.ts        pure state transitions (tested)
src/store/gym.tsx           provider, persistence, derived data
src/lib/progress.ts         history, ghosts, PRs, overload, weekly rollups
src/lib/search.ts           exercise ranking + ghost completion
src/lib/timer.ts            rest-timer engine + saved-timer settings (tested)
src/lib/backup.ts           backup / restore / merge / CSV (tested)
src/lib/appdata.ts          data normalisation + merge (tested)
src/lib/routines.ts         plan builder + routine helpers (tested)
src/lib/stats.ts            volume, records, muscle split, summary, goals (tested)
src/lib/calc.ts             1RM, plates, warm-ups (tested)
src/lib/notify.ts, files.ts, diagnostics.ts   native-facing helpers (safe no-ops on web)
src/__tests__/              UI tests (Jest + Testing Library)
src/store/timer.tsx         timer provider: scheduling, persistence, keep-awake
src/components/             Header, ExerciseSearch, SetRow, SetTable, LogDock,
                            RestBanner, TimerDashboard, ExerciseInsights,
                            WeeklyProgressCard, Sheet, …
tailwind.config.js          color + type tokens (28/17/20/15/12 scale)
```

## Design notes
- Accent `#30D158` is used only for: the log check, the active set, and positive diffs. Negative diffs stay grey.
- Sheets and state changes use 250 ms ease-out. Logging a set triggers a micro-bounce, a brief green glow, and haptics (impact on log, success on PR).
- Weights and reps use `ui-rounded` (SF Pro Rounded on Apple platforms, system font elsewhere). No font files are bundled.
- "Glass" rows are translucent layers over true black rather than a real blur, which keeps them cheap on OLED.
- The weekly delta compares against the same weekdays last week, including today's full session, so it reads low early in a workout and catches up as you log.
