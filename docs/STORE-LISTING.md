# LogSetGo: store listing kit

Ready-to-paste copy and answers for the **App Store** and **Google Play**. I can't publish for you (that needs your paid developer accounts), but everything the submission forms ask for is here.

> Check each store's current field limits and screenshot sizes when you submit. They change. Everything below fits the limits as of writing.

## Identity

| Field | Value |
|---|---|
| App name | LogSetGo |
| iOS bundle ID / Android package | `com.vaishakskumar.logsetgo` |
| Category | Health & Fitness |
| Privacy policy URL | https://vaishakskumar.github.io/LogSetGo/privacy.html |
| Support URL | https://github.com/VaishakSKumar/LogSetGo/issues |
| Price | Free, no in-app purchases |

## App Store

**Subtitle (30 chars max):** `Log sets. Rest. Progress.`

**Promotional text (170 max):**
Log a set in one tap, let the rest timer start itself, and watch your streak, records and weight trend build. No account, no ads, no tracking.

**Keywords (100 chars max):**
`workout log,gym tracker,rest timer,BMI,weight,attendance,routine,PR,sets reps,lifting,fitness`

**Description**

LogSetGo is a distraction-free gym tracker built for the gym floor. Track. Rest. Progress.

LOG FASTER
• Your last weights and reps are pre-filled in grey. Tap to accept, or just tap the check.
• Set-by-set +/- steppers with your own plate step (1, 1.25, 2.5, 5 …).
• Warm-up sets, RPE and notes on any set. Warm-ups never inflate your volume or records.

REST, AUTOMATICALLY
• The rest timer starts the moment you log a set.
• One-tap presets (0:30, 1:00, 1:30, 2:00), plus saved custom timers.
• Green while running, yellow for the last 10 seconds, and a buzz at 0:00, even with the app closed.

SHOW UP
• A calendar of Present, Absent and Holiday days, with your streak and attendance rate.

PROGRESS YOU CAN SEE
• Personal records, estimated 1-rep max, weekly volume, and muscle balance.
• Goals with a pace estimate: "82.5 / 100 kg, about 9 weeks at your current pace."
• Progressive-overload suggestions with plain-English reasons.
• Body-weight log with height, BMI gauge and trend.

PLAN YOUR TRAINING
• Save routines and start them in one tap.
• A plan builder lays out a full week from your goal, days and level.
• Tools: 1RM and percentage table, plate calculator, warm-up ramp.

YOURS ALONE
• No account. No ads. No tracking. Your data stays on your device.
• Export a backup or CSV any time, and restore it on a new phone.

LogSetGo is a tracking tool, not medical advice.

**What's new (first release):** First release. Track. Rest. Progress.

**Age rating:** 4+ (no objectionable content). Answer "No" to every content question.

**App Privacy ("nutrition label"):** choose **Data Not Collected**. Health and fitness data is entered by the user and stays on the device; nothing is transmitted to you or a third party. (If you later add analytics, cloud sync or a crash service, this must change.)

**Export compliance:** the build already sets `ITSAppUsesNonExemptEncryption = false`.

## Google Play

**Short description (80 chars max):**
`Fast gym logging, auto rest timer, attendance streaks and weight & BMI tracking.`

**Full description:** use the App Store description above.

**Data safety form**
- Does your app collect or share any of the required user data types? **No**
- Is all of the user data collected by your app encrypted in transit? *Not applicable, no data leaves the device.*
- Do you provide a way for users to request that their data be deleted? *Not applicable: data is only on the device; uninstalling deletes it.*

**Content rating (IARC questionnaire):** answer "No" to violence, sexual content, language, controlled substances, gambling, and user-generated content. Expected rating: Everyone.

**Permissions the app requests:** notifications (only if the user enables alerts), vibration. No location, camera, contacts or storage permissions.

**Health apps declaration:** Play may ask whether the app is a health app. It is a fitness *tracker*, with no medical claims. The description carries the "not medical advice" line.

## Graphics checklist

| Asset | Where it comes from |
|---|---|
| App icon 1024×1024 (iOS) | `assets/icon.png` (done) |
| App icon 512×512 (Play) | resize `assets/icon.png`, or `public/icons/icon-512.png` (done) |
| Feature graphic 1024×500 (Play) | **you need to make this**: logo on true black with the tagline "Track. Rest. Progress." |
| Phone screenshots | capture from a real device or simulator at each store's required sizes (see below) |

**Suggested screenshot order (each with a short caption):**
1. Set table, "Your last weights, pre-filled"
2. Rest timer banner, "Rest starts itself"
3. Attendance calendar, "Show up. Build the streak"
4. Stats and records, "See your progress"
5. BMI & Weight, "Weight and BMI at a glance"
6. Routines / plan builder, "Plan your week"

## Release checklist

- [ ] Real-device test on one iPhone and one Android phone (haptics, notifications, keyboard, file export/import)
- [ ] Enable **Rest-over alert**, lock the phone, and confirm the buzz at 0:00
- [ ] Export a backup and restore it on a second device
- [ ] `npm run qa:gate` passes
- [ ] Version bumped in `app.json`
- [ ] Privacy policy URL loads (deploy the web app first)
- [ ] `npx eas-cli build --platform all --profile production`, then `npx eas-cli submit`
