# LogSetGo: install it, run it, share it

Two parts:

1. **Run it on your own machine** (to develop or just try it)
2. **Get it onto your friends' phones** (iPhone and Android)

> Prices, quotas and store rules change. Check the linked Apple / Google / Expo pages before you pay for anything. The steps below were checked against the project's config (`expo-doctor` passes 21/21), but a real cloud build needs *your* accounts, so I have not run one.

---

## Part 1: Run it on your machine

### What you need (one time)

| Tool | Get it | Check |
|---|---|---|
| Node.js (LTS) | https://nodejs.org | `node -v` |
| Git | https://git-scm.com | `git --version` |
| A code editor (optional) | https://code.visualstudio.com | |

### Install and start

```bash
git clone https://github.com/VaishakSKumar/LogSetGo.git
cd LogSetGo
npm install
npx expo start
```

A terminal menu appears. Pick how to view the app:

| Press | What happens | Needs |
|---|---|---|
| `w` | Opens the app in your browser (resize to phone width for the real layout) | nothing else |
| `a` | Opens the Android emulator | Android Studio + a virtual device |
| Scan the QR code | Runs on your real phone inside **Expo Go** | Expo Go app; phone and PC on the same Wi-Fi |
| `i` | iOS simulator | a Mac with Xcode (not possible on Windows) |

**Expo Go note:** Expo Go only supports the SDK versions it currently ships with. LogSetGo uses a very new SDK (57). If Expo Go says the project is incompatible, don't fight it: use `w` for quick checks and Part 2 for real phone installs.

### Try it with sample data

Create a file named `.env.local` in the project root containing one line:

```
EXPO_PUBLIC_DEMO=1
```

Restart `npx expo start`. On first launch (nothing saved yet) it fills in five weeks of workouts, attendance and body weight. **Delete the file** to go back to a clean app. Clear the browser's site data if you already opened the app once.

### Check that everything is healthy

```bash
npm run qa:gate      # type-check, logic tests, UI tests, iOS + Android + web build checks
```

### Regenerate the logo (only if you change it)

```bash
npm run icons
```

---

## Part 2: Give it to your friends

### Pick a route

| Route | iPhone | Android | Cost | Friend's effort | You need |
|---|---|---|---|---|---|
| **A. Web app link** | yes | yes | free | open link, "Add to Home Screen" | GitHub Pages switched on (1 minute, already set up) |
| **B. Android APK** | no | yes | free | tap link, install | free Expo account |
| **C. iPhone via TestFlight** | yes | no | Apple Developer Program, about $99 / year | install TestFlight, accept invite | Apple developer account |
| **D. iPhone ad-hoc build** | yes | no | same $99 / year | register phone, install from link | Apple developer account |

**Recommended:** start with **A** for everyone today (it's already built), add **B** for Android friends who want a real app, and add **C** only if you're happy paying for iPhone friends.

There is **no free way to put a real native app on someone else's iPhone**. That is Apple's rule, not a limit of this project. Route A is the free iPhone answer.

### Important: everyone's data is private to their own device

LogSetGo stores everything on the device it runs on. There is no account or server. Friends will not see each other's data, and you can't see theirs. Reinstalling, or clearing browser data, erases it. That's good for privacy, but tell your friends.

**Tell them about backups:** Settings (the sliders button, top right) → **Export backup** saves one file with everything, and **Import backup** restores it on a new phone. It's the only protection against losing data.

---

### Route A: web app link (iPhone + Android, free)

LogSetGo's web version is an **installable web app (PWA)**: friends open a link, add it to their home screen, and it opens full-screen with its own icon, and keeps working with no internet after the first load.

**Your link:** `https://vaishakskumar.github.io/LogSetGo/`

#### One-time setup: switch on GitHub Pages (about 1 minute)

The repo already contains an automatic publisher (`.github/workflows/deploy-web.yml`). GitHub just needs to be told to use it:

1. Open your repo on GitHub → **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Go to the **Actions** tab. If the latest "Deploy web app" run failed (it does until step 2 is done), open it and click **Re-run all jobs**.
4. When it turns green (a few minutes), your link is live.

From then on, **every push to `main` republishes the site automatically** after type-checking and running the tests. Friends get updates the next time they open the app while online.

#### What friends do

- **iPhone (must be Safari):** open the link → **Share** button → **Add to Home Screen** → **Add**.
- **Android (Chrome):** open the link → tap **Install** on the prompt, or ⋮ menu → **Install app**.

That's it. There is no account, no store, and no download.

#### Try it locally first (optional)

```bash
EXPO_BASE_URL=LogSetGo npm run build:web        # builds ./dist exactly like the publisher does
npm run preview:web -- --base=LogSetGo          # http://localhost:5000/LogSetGo/
```

Leave `EXPO_BASE_URL` off (and `--base`) to build for a site served from the root of its own domain.

#### Other hosts

`npm run build:web` produces a plain `dist/` folder. Any static host works: Netlify (drag `dist` onto app.netlify.com/drop with a free account), Vercel, Cloudflare Pages. Build without `EXPO_BASE_URL` when the site lives at the domain root.

#### Limits of the web version (tell friends)

- **No haptic vibration.** The buzz at 0:00 on the rest timer is silent on the web.
- **The screen may lock** during a rest countdown.
- **Data lives in that browser only.** iPhone Safari can erase saved data for sites unused for about a week, unless the app was added to the Home Screen (installed apps are exempt). Clearing browser data erases it.
- **Updates need a connection** once: the app checks for a newer version when opened online and switches over the next time it's opened.

---

### Route B: Android APK (free)

Do this once:

1. Create a free account at https://expo.dev.
2. In the project folder:
   ```bash
   npx eas-cli login
   npx eas-cli init          # links this project to your Expo account (edits app.json)
   ```
3. Build:
   ```bash
   npx eas-cli build --platform android --profile preview
   ```
   It builds in Expo's cloud (queue time depends on the free plan). When done you get a link and a QR code to a `.apk` file.

Send friends the link. They:

1. Open it on their Android phone and download the APK.
2. If asked, allow **Install unknown apps** for the browser they used.
3. Tap the file → **Install**. If Google Play Protect warns about an unrecognised app, choose **Install anyway**.

To ship an update: change the code, run the build command again, send the new link. (Installing over the old one keeps their data.)

---

### Route C: iPhone via TestFlight (paid Apple account)

One time:

1. Join the **Apple Developer Program** at https://developer.apple.com/programs (about $99 / year; approval can take a day or more).
2. `npx eas-cli login`, then `npx eas-cli init` (see Route B).

Each release:

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios
```

EAS will ask you to sign in to your Apple account and will create the certificates for you. Then in **App Store Connect → TestFlight**:

- Add friends as **external testers** by email, or create a **public link** (up to 10,000 people). The first build goes through a short Apple beta review.
- ("Internal testers", up to 100, skip that review but must be members of your Apple developer team, which isn't what you want for friends.)

Friends install the free **TestFlight** app, open your invite or link, and tap **Install**. TestFlight builds expire after 90 days, so upload a fresh build before then.

---

### Route D: iPhone ad-hoc build (paid Apple account, small groups)

Skips TestFlight but is fiddlier: each friend's phone must be registered first (max 100 devices per year).

```bash
npx eas-cli device:create      # gives you a link/QR for each friend to open on their iPhone
npx eas-cli build --platform ios --profile preview
```

Friends open the build link on their iPhone. On iOS 16+, they must first turn on **Settings → Privacy & Security → Developer Mode** and restart. If you add a new friend later, register their phone and build again.

---

## Later: the public stores (optional)

| Store | Cost | Command |
|---|---|---|
| Google Play | about $25, one time | `npx eas-cli build -p android --profile production`, then `npx eas-cli submit -p android` |
| Apple App Store | about $99 / year (same as TestFlight) | `npx eas-cli submit -p ios` after a production build |

Both stores need a privacy policy page and store screenshots. The app collects no data and has no network calls, so the policy is short.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `npm install` fails | Update Node to the current LTS, delete `node_modules`, retry |
| Expo Go says project is incompatible | Use `w` (web) or build with Route B / C |
| Phone can't see the dev server | Same Wi-Fi as the PC, or run `npx expo start --tunnel` |
| Web shows old data | Clear the site's storage; delete `.env.local` if demo data isn't wanted |
| EAS build fails | Run `npx expo-doctor`, fix what it lists, retry. Open the build log on expo.dev |
| App name / icon looks old on the phone | Uninstall and reinstall; home-screen icons are cached |

## What has and hasn't been verified

- **Verified:** the project config passes `expo-doctor` (21/21); iOS and Android bundles compile; the web export builds; 57 logic tests pass.
- **Not verified:** a real EAS cloud build, a real phone install, haptics, and the Android keyboard behaviour. Those need your accounts and a device.
