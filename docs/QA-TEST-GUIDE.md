# LogSetGo QA Test Guide

This guide lists what the current app does and how to test it. Report anything that behaves differently.

Only part of the redesign is in the app. Do not raise bugs against mockups that aren't built yet. See [Not in this build](#14-not-in-this-build).

---

## 1. Test setup

### Where to test

| Platform | How to get it | Priority |
|---|---|---|
| Android | APK from the owner, or from the web link | High |
| Web | <https://vaishakskumar.github.io/LogSetGo/> in Chrome or Safari | High |
| iPhone | TestFlight if available, otherwise Safari "Add to Home Screen" | Medium |

Check phone sizes around 360 × 800 and 390 × 844.

### Starting clean

| Platform | How to reset |
|---|---|
| Android or iPhone | Uninstall and reinstall |
| Web | Clear the site's data in browser settings |

All data lives on the device. There is no login. Reinstalling or clearing site data erases everything, unless a backup was exported.

### Changing the date

Streaks and date rules depend on the device date. To test them, change the phone's date in system settings, then restore automatic time when finished.

### Reporting a bug

Include the platform, device, app version (Settings → About), steps, expected result, actual result and a screenshot or video. After a crash, also include the log from Settings → Diagnostics → Share log.

---

## 2. Navigation

The floating bottom bar has three tabs: Attendance, Gym Progress, and Account. The open tab sits in a green circle. Settings is the sliders button at the top right of Attendance. The app opens on **Attendance**.

| ID | Test | Expected |
|---|---|---|
| NAV-1 | Open the app | Attendance tab shows |
| NAV-2 | Switch tabs and come back | Scroll position and the calendar month are kept |
| NAV-3 | Start a rest timer, then switch tabs | The countdown stays visible on every tab |
| NAV-4 | Android: press Back on another tab | Returns to Attendance |
| NAV-5 | Android: press Back on Attendance | App closes |

---

## 3. Attendance

The Attendance tab shows today's check-in card and a Monday-to-Sunday row. The calendar button, the streak count and any day in the row open the calendar popup.

| Status | Colour | What happens |
|---|---|---|
| Present | Green | Marks the date. From the punch sheet it also opens Gym Progress. |
| Absent | Red | Marks the date and stays on the page |
| Holiday | Yellow | Marks the date and stays on the page |

### Punch In card and weekly row

| Day | Row |
|---|---|
| Present | Solid green `#2CE573` |
| Absent | Solid red `#FF4D4D` |
| Holiday | Solid yellow `#FFC107` |
| Not marked | Dark grey with grey text |
| Today, not marked | Green outline |

| ID | Test | Expected |
|---|---|---|
| PUNCH-1 | Tap the card | A sheet slides up with 3 options. Nothing is marked yet. |
| PUNCH-2 | Tap outside the sheet | Sheet closes and today stays unmarked |
| PUNCH-3 | 🟢 Start Workout | Today is Present and Gym Progress opens |
| PUNCH-4 | 🔴 Mark Rest/Absent Day | Today is Absent and the sheet closes |
| PUNCH-5 | 🟡 Mark Travel/Holiday | Today is Holiday and the sheet closes |
| PUNCH-6 | Tap Absent, then Holiday, under the card | One tap marks each. The card fills with that status and shows Undo. |
| PUNCH-7 | After punching in | Card shows the punch-in time and a running workout time |
| PUNCH-8 | Undo punch-in, or Undo | The Punch In card and its buttons come back |
| PUNCH-9 | Kill and reopen after punching in | Time and running count are kept |
| PUNCH-10 | Mark days with each status | Row colours match the table |

### Calendar popup and streak

- **Streak:** consecutive present days ending today. A Holiday pauses it. An Absent or an unmarked past day breaks it. An unmarked today doesn't break it.
- The popup counts Present, Absent and Holiday days.

| ID | Test | Expected |
|---|---|---|
| ATT-1 | Weekly view | Big month and date, curved dial of days. Swipe it to move a day at a time. |
| ATT-2 | Monthly view, Previous and Next month | Grid changes month and keeps its marks |
| ATT-3 | Mark a date from the popup | Dot, counts, dashboard and row update |
| ATT-4 | Open a future date | Only Holiday is available |
| ATT-5 | Tap the selected status again | Status is removed and counts update |
| ATT-6 | Three Present days, a Holiday, then Present | Streak keeps counting across the Holiday |
| ATT-7 | Present, then an unmarked past day, then Present today | Streak restarts at 1 |
| ATT-8 | Open September, then pick the 30th | Month and date titles fit on one line in both views |
| ATT-9 | Log a set, then check that day | It shows as Present |
| ATT-10 | Kill and reopen the app | Marks are still there |

---

## 4. Gym Progress access

| Today's status | Gym Progress |
|---|---|
| Not marked | "Punch in first", with a Go to Punch In button |
| Absent | Full red page, with a Change today’s status button |
| Holiday | Full yellow page, with a Change today’s status button |
| Present | Open |

Other dates can always be viewed. Swipe left or right, use the arrows, or tap the date for the calendar. Today has the workout-day name at the top right; other dates have a Today link. Locked pages show neither the name nor the + button.

| ID | Test | Expected |
|---|---|---|
| GATE-1 | Open Gym Progress with today unmarked | Lock screen shows |
| GATE-2 | Tap Go to Punch In | Moves to Attendance |
| GATE-3 | Log a set, then mark today Absent | Logger locks. Logged data is not deleted. |
| GATE-4 | Mark today Present again | Logged sets are back |

### Monthly photo check-in

The first time Gym Progress opens for today in a new calendar month, a full-screen check-in appears. Skip for now opens the workout, and it does not ask again until next month. Account adds or replaces the photo any time. It shows last month's photo on the left and the new photo on the right.

Allowed: GIF, JPG, PNG and WebP, up to 10 MB. Photos are not in backups.

| ID | Test | Expected |
|---|---|---|
| PHOTO-1 | First workout of the month | Check-in shows with Skip for now |
| PHOTO-1a | Tap Skip for now, kill and reopen the app | Workout opens and the check-in does not return this month |
| PHOTO-1b | Account → Add monthly check-in photo → save | Card changes to three months with Replace |
| PHOTO-1c | Account → Replace → save | The new photo shows. There is still one photo this month. |
| PHOTO-2 | No earlier photo | Left slot says "No earlier photo yet" |
| PHOTO-3 | Take photo, allow the camera | Photo shows on the right. Save photo is enabled. |
| PHOTO-4 | Deny camera permission | Clear message, and Choose a file still works |
| PHOTO-5 | Choose a PDF, DOCX or video | Red warning, nothing saved, gate stays |
| PHOTO-6 | Choose an 11 MB image | "Too big" warning, gate stays |
| PHOTO-7 | Try a GIF, JPG, PNG and WebP under 10 MB | Each is accepted |
| PHOTO-8 | Save, then kill and reopen the app | Gate does not return this month |
| PHOTO-9 | Move the device date to next month | Gate returns, with the saved photo on the left |
| PHOTO-10 | View a past date | Gate does not show |

---

## 5. Moving between dates

Use ‹ and › beside the date.

| Date | Behaviour |
|---|---|
| Today | Full logging |
| Past | Read-only. No Add exercise, no ••• menu, no swipe-to-delete. Empty days say "Nothing was logged on this day." |
| Future | "No workout logged for this date yet." Nothing can be logged. |

| ID | Test | Expected |
|---|---|---|
| DATE-1 | Step to a past date with sets | Sets show, with no edit controls |
| DATE-2 | Step to a future date | Empty message, no logging |
| DATE-3 | Tap Jump to today | Returns to today |
| DATE-4 | Mark a past date Present | Gym Progress opens on that date, read-only |

---

## 6. Exercise search

The list has 1,146 exercises.

| ID | Test | Expected |
|---|---|---|
| SRCH-1 | Tap the search box | Recent and suggested exercises show straight away |
| SRCH-2 | Type `bench` | Up to 30 matches show, each with its muscle group and equipment |
| SRCH-3 | Type `pull-up` and press Return | Picks plain **Pull-Up**, not a variation |
| SRCH-4 | Type `in` | Grey ghost text completes the top match |
| SRCH-5 | Tap each filter: Barbell, Dumbbell, Machine, Cable, Bodyweight, Cardio | Only that equipment shows. Long lists say "30 of N. Type to narrow". |
| SRCH-6 | Pick a filter, then type | Search stays inside that filter |
| SRCH-7 | Tap the selected filter again | Filter clears |
| SRCH-8 | Type a new name such as `My Row` | An Add option shows and asks for a muscle group |
| SRCH-9 | Type text, then tap ✕ | Text clears and the cursor stays in the field |
| SRCH-10 | Search `ohp` | Overhead Press shows (alias) |
| SRCH-11 | Scan names while filtering | No `(male)`, `lever`, `pov` or broken characters |

---

## 7. Logging sets

Picking an exercise opens the recorder drawer. It starts with 3 sets unless the last session suggests otherwise.

### Form guide

The top of the recorder shows form media and bulleted cues. No exercise ships with a video yet, so paste one to test.

| ID | Test | Expected |
|---|---|---|
| MEDIA-1 | Open Barbell Bench Press | "Keep elbows tucked" and other cues show |
| MEDIA-2 | Paste a non-YouTube link | "That isn't a YouTube link." |
| MEDIA-3 | Paste a valid watch, youtu.be or Shorts link | Video plays muted and loops |
| MEDIA-4 | Reopen the exercise another day | Video is still there |
| MEDIA-5 | Remove video | The paste box returns |
| MEDIA-6 | Play with no internet | No crash. The rest of the screen still works. |

### kg rules

| Exercise type | kg box |
|---|---|
| Weighted (bench press, machines) | Normal **kg** box. It may be left blank. |
| Bodyweight (pull-up, push-up) | Optional **+kg** box for extra weight. The stepper reads Extra kg. |
| Cardio (treadmill, jump rope) | No kg box at all |

A set needs reps or time. A blank kg box logs as no added weight, unless a grey suggestion is showing, in which case that suggestion is used.

| ID | Test | Expected |
|---|---|---|
| LOG-1 | Bench press: enter kg and reps, tap the check | Set logs, row locks, glow and haptic, timer starts if auto-start is on |
| LOG-2 | Tap the check on an empty row | Row shakes, nothing logs |
| LOG-3 | Tap the check on a logged set | Set reopens for editing |
| LOG-4 | Bench press: leave kg blank, enter reps, log | Logs with no weight and shows reps only |
| LOG-5 | Pull-Up | Header shows +KG. Logs with reps only. |
| LOG-6 | Pull-Up with extra weight | Logs as weight × reps and counts toward volume |
| LOG-7 | Treadmill Run | No kg column or stepper. Time only. |
| LOG-8 | No-kg exercise card | Shows reps only and "Total reps N", not "0 × 8" |
| LOG-9 | Second session of an exercise | Grey values match last time. Tapping a grey box accepts it. |
| LOG-10 | Change weight on set 1 | Later grey values follow the new weight |
| LOG-11 | Add set | New row copies the set above |
| LOG-12 | Remove | Removes the last unlogged row |
| LOG-13 | Steppers | Weight moves by the Settings step. Reps by 1. Time by 5 seconds. Stepping down to 0 clears a suggested weight. |
| LOG-14 | Tap Done with no checked set | Drawer stays open and explains why |
| LOG-15 | Tap Done with a checked set | Drawer closes and scrolls to the summary |
| LOG-16 | Check a set, then drag the drawer down | The set is saved |
| LOG-17 | Kill and reopen after logging | Sets are still there |
| LOG-18 | Enter invalid text or very large numbers | No crash, and the value is rejected or stays sensible |

### Reps or Time

| ID | Test | Expected |
|---|---|---|
| MODE-1 | Pick Plank | Opens in Time mode |
| MODE-2 | Enter `70`, then enter `1:10` | Both show as 1:10 |
| MODE-3 | Switch an exercise's mode, then reopen it another day | It remembers the mode |
| MODE-4 | Switch mode with sets already logged | Logged sets don't change |
| MODE-5 | Time-mode card | Shows Time under tension, not volume |
| MODE-6 | Time-based exercise | Not counted in kg volume, and there is no kg goal |

### Set details

Tap a set number.

| ID | Test | Expected |
|---|---|---|
| SET-1 | Mark a warm-up | Shows W. Not counted in sets, volume, PRs or suggestions. |
| SET-2 | Add RPE and a note | Saved, and a dot shows on the set |

### Day summary and deleting

| ID | Test | Expected |
|---|---|---|
| DAY-1 | Log sets | Summary shows exercises, sets and volume, and counts up |
| DAY-2 | Swipe a card left, or use ••• | "Delete…?" confirmation shows |
| DAY-3 | Confirm delete | Only that day's exercise goes, and totals drop |
| DAY-4 | ••• → Add or edit sets | Recorder opens on that exercise |
| DAY-5 | Pick an exercise without logging | It does not appear in the logged feed |

---

## 8. Progress and suggestions

| ID | Test | Expected |
|---|---|---|
| PROG-1 | Beat a previous weighted best | PR shows on the set |
| PROG-2 | Beat your best reps on a no-kg exercise | PR shows on the set |
| PROG-3 | Beat your longest hold | PR shows on the set |
| PROG-4 | Open Progress and History | Best set, estimated 1RM, trend and past sessions show |
| PROG-5 | No-kg exercise history | Shows reps, with no "0 kg" and no Est. 1RM |
| PROG-6 | Bodyweight "Try today" | Suggests one more rep than the best set |
| PROG-7 | Tap Use | Suggested values fill the rows |

"Try today" rules for weighted exercises, based on last session's heaviest sets:

| Last session | Suggestion |
|---|---|
| Every set 12 reps or more | Add one weight step and restart at 8 reps |
| All sets equal, 6 reps or fewer | Add one weight step |
| All sets equal, 7 to 11 reps | One more rep per set |
| Uneven sets | Bring every set up to the best one |

### Goals

| ID | Test | Expected |
|---|---|---|
| GOAL-1 | Set a kg goal on a weighted exercise | Progress shows, and a pace estimate after 3+ sessions over a week |
| GOAL-2 | Open a bodyweight or time exercise | No kg goal section. The note field remains. |

---

## 9. Rest timer

| ID | Test | Expected |
|---|---|---|
| TIME-1 | Tap a preset (0:30, 1:00, 1:30, 2:00) | Countdown starts |
| TIME-2 | Log a set with auto-start on | Full-screen countdown appears straight away with a ring. A fresh install starts at 1:00. |
| TIME-2a | On the overlay, tap +15s, then Skip | Time goes up by 15 seconds. Skip closes the overlay. |
| TIME-3 | Undo a set | Timer does not start |
| TIME-4 | +15s, Pause, Resume, Skip | Each works |
| TIME-5 | Last 10 seconds | Turns yellow |
| TIME-6 | Reach 0:00 | Shows "Rest over", vibrates on phones, clears after about 6 seconds |
| TIME-7 | Background the app and return | Time stays accurate |
| TIME-8 | Create a custom timer | Saved and startable. Up to 20 are allowed. |
| TIME-9 | Android or iPhone: Rest-over alert on, close the app | Notification arrives when the rest ends |
| TIME-10 | Log on a viewed past date | Not possible, so no timer starts |

---

## 10. Workout day names

| ID | Test | Expected |
|---|---|---|
| NAME-1 | Tap the day name and pick another | Today's label changes |
| NAME-2 | Tap the green +, enter a name, Save & Apply | Saved for later and applied today. Names are limited to 28 characters. |
| NAME-3 | Long-press a custom name, then tap the trash | Removed from the picker. Days already logged keep the label. |
| NAME-4 | Long-press a default, then tap the trash | Hidden. Restore defaults brings it back. |

---

## 11. Quick actions

| ID | Area | Test | Expected |
|---|---|---|---|
| QA-1 | Routines | Save a day, then start it | Rows appear for each exercise |
| QA-2 | Routines | Save under an existing name | Updates it, with no duplicate |
| QA-3 | Routines | Plan builder: goal, 2 to 6 days, level | Builds a sensible plan offline |
| QA-4 | Stats | Switch 4, 12 and 26 weeks | Charts update. Show data opens a table. |
| QA-5 | Stats | Muscle balance and records | Match logged data |
| QA-6 | Summary | Finish a workout | Duration, volume, sets, PRs and top sets show |
| QA-7 | Tools | 1RM, plate calculator, warm-up ramp | Values are correct, in kg and lb |
| QA-8 | Weekly card | Log sets | Updates straight away |

Weekly goal: 3 workouts a week.

---

## 12. Account, BMI and weight

Valid ranges: weight 20 to 400 kg, height 100 to 250 cm.

BMI = kg ÷ m². The category uses the one-decimal value shown, so 24.96 reads 25.0 Overweight.

| BMI | Category | Colour |
|---|---|---|
| Under 18.5 | Underweight | Grey |
| 18.5 to 24.9 | Healthy | Green |
| 25.0 to 29.9 | Overweight | Yellow |
| 30.0 or more | Obese | Red |

Change colours depend on the effect, not the direction: toward Healthy is green, further away is red, within the same band is grey.

| ID | Test | Expected |
|---|---|---|
| BMI-1 | 170 cm and 70 kg | BMI 24.2, Healthy |
| BMI-2 | 170 cm and 85 kg | BMI 29.4, Overweight, and +15 kg shows |
| BMI-3 | Enter 5 kg | Save is blocked and the valid range shows |
| BMI-4 | Save without changing the weight | Blocked with "No change to save" |
| BMI-5 | Enter height in cm and ft/in | BMI recalculates |
| BMI-6 | Hold the stepper | Value repeats |
| BMI-7 | History → Edit → delete | Entry goes and the trend updates |
| BMI-8 | Reopen the next day | Weight stays, with no daily prompt |
| GOAL-1 | Type goal 70 at 170 cm and 85 kg | "BMI at goal: 24.2, Healthy", "15 kg to lose" |
| GOAL-2 | Type 12 or 400 | "Enter a weight from 30 to 300 kg", old goal kept |
| GOAL-3 | Goal equal to your weight | "You have reached your goal" |
| STAT-1 | Gym Attendance with nothing marked | 0 days, "No days marked", dash in the gauge |
| STAT-2 | Mark 3 of 5 days this week | Bar shows 60%, "3 of 5 days done, 2 to go" |
| STAT-3 | Tap that pill, choose 3 | Goal changes and shows "goal reached" |
| STAT-4 | Month arrows | Stop at the first marked month and at this month |
| WEIGHT-1 | Weight Progress with no weights | "Log your first weight to start your chart." |
| WEIGHT-2 | 1 month, 3 months, All | Chart and tiles change. Tapping a point updates the readout. |
| WEIGHT-3 | Set a goal | Dashed goal line, inside the chart scale |

### Punch out

| ID | Test | Expected |
|---|---|---|
| OUT-1 | Punch in, tap Punch Out | Timer freezes. Day stays Present and sets can still be logged. |
| OUT-2 | Tap Undo punch-out | Timer runs again from the original punch-in |
| OUT-3 | Punch in and leave it past midnight, open the app | "You didn't punch out" asks when you left |
| OUT-4 | Move the time to each limit | − stops 15 minutes after punch-in, + stops at 11:59 pm |
| OUT-5 | Save time | "Saved: h:mm in the gym yesterday" and the sheet closes |
| OUT-6 | I don't remember | Sheet closes, no time saved, not asked again |
| OUT-7 | Close the app without answering, reopen | Asks again |
| OUT-8 | Two missed days | Asks about each, oldest first |

### Keyboard

| ID | Test | Expected |
|---|---|---|
| KEY-1 | Tap any field: sets, weight, goal, plan name, search, notes | The field and what you type stay above the keyboard |

### Recording sets

| ID | Test | Expected |
|---|---|---|
| REC-1 | Open an exercise | Every set's kg and reps are empty. "Last" shows last session. |
| REC-2 | Type kg, press Next on the keyboard | The cursor moves to reps |
| REC-3 | Type reps, tap the tick without closing the keyboard | The set logs exactly what was typed |
| REC-4 | Log set 1 | Set 2 stays empty, nothing copied from set 1 |
| REC-5 | Tap a filled kg or reps, type a new value, tick | The field empties with the old value in grey; the new value is logged. Leaving it empty keeps the old value. |
| REC-6 | Tick with no reps | The row shakes and nothing is logged |
| REC-7 | Switch kg / lbs above the sets | Every weight reads in the new unit; saved weights do not change |
| REC-8 | Log a set and let the rest run out | The rest screen closes by itself, back on the sets |

### New workout plan

The + beside the day name opens it. Saving a plan logs nothing.

| ID | Test | Expected |
|---|---|---|
| PLAN-1 | + → Add manually | Info screen, then the builder |
| PLAN-2 | Don't show this again, reopen | Info screen skipped |
| PLAN-3 | Builder with no name or no exercise | Save plan disabled |
| PLAN-4 | + → Import from a file → .txt, .csv or .xlsx | Review list with matches ticked |
| PLAN-5 | A name not in the list | Yellow "Not in our list", Save disabled until Add as new |
| PLAN-6 | Choose a PDF | "That file can't be used" |
| PLAN-7 | Choose an old .xls | Message asks for .xlsx |
| PLAN-8 | Choose a file over 2 MB | "That file is too big" |
| PLAN-9 | Choose an empty file, or one with no exercises | Clear message, nothing saved |
| PLAN-10 | Tap a saved plan | Exercises open with sets and reps filled in, weight empty, last weight grey |
| PLAN-11 | Close without ticking | "To do today" lists them. Summary, stats and PRs don't change. |
| PR-1 | Log a heavier best set than every earlier week | Banana-yellow PR dot, readout says "new PR" |
| PR-2 | First week of an exercise | Plain dot, never PR |

---

## 13. Settings

| ID | Test | Expected |
|---|---|---|
| SET-3 | Switch kg and lb | All weights convert. Switching back restores the same values. |
| SET-4 | Change weight step | Steppers and suggestions use the new step |
| SET-5 | Daily reminder on | Hour can be set and the reminder arrives (phones only) |
| SET-6 | Send test alert | Notification arrives (phones only) |
| SET-7 | Web | Notification switches are disabled |
| SET-8 | Export backup | One JSON file is produced |
| SET-9 | Import, Merge | Adds missing data and keeps existing data |
| SET-10 | Import, Replace | Restores exactly what is in the file |
| SET-11 | Import a bad file | Readable error, and nothing changes |
| SET-12 | Workouts CSV, Weight CSV | Open correctly in a spreadsheet |
| SET-13 | Diagnostics | Shows recent errors. Share log and Clear work. |
| SET-14 | About | Correct version. Privacy policy opens. |

### Web and offline

| ID | Test | Expected |
|---|---|---|
| WEB-1 | Install from Chrome, or Add to Home Screen on Safari | Opens full-screen with its own icon |
| WEB-2 | Open once, go offline, reopen | App works |
| WEB-3 | Web | No vibration or closed-app notifications. This is expected. |

### General checks

- Text is not cut off or overlapping on small phones.
- Content clears the notch and the bottom bar.
- The keyboard doesn't cover the field being typed in.
- Targets are easy to tap, and a screen reader announces buttons.
- Long names and large numbers fit.
- An app upgrade keeps all existing data.
- Search stays smooth with the full exercise list.

---

## 14. Not in this build

Do not raise these as bugs. They are planned or known.

| Item | Status |
|---|---|
| Login and OTP | Hidden until after the beta test |
| Logging sets on past days | Not allowed today |
| 0 kg in Today's workout on no-weight days | Known |
| A few imported exercises under the wrong body part | Known source-data issue. Report only obvious ones. |
