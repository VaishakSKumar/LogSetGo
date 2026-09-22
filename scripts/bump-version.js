#!/usr/bin/env node
/**
 * Bumps the app's version (shown in phone Settings and the About section) in both app.json and
 * package.json, keeping them in sync.
 *
 * Scheme: patch climbs 0 -> 9 for ordinary updates; the update after .9 rolls into the next minor
 * and resets patch to 0 (1.0.9 -> 1.1.0), instead of ever reaching two-digit patches. `--minor`
 * forces that rollover early, and `--major` bumps the major version and resets minor + patch to 0.
 * This only touches the human-readable version string — it has nothing to do with the Android
 * versionCode / iOS build number, which `eas.json`'s `autoIncrement` manages separately per build.
 *
 * Usage: node scripts/bump-version.js [--minor|--major] [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--major') ? 'major' : args.includes('--minor') ? 'minor' : null;

function nextVersion(current, forceLevel) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) throw new Error(`"${current}" isn't a plain major.minor.patch version`);
  let [, major, minor, patch] = m.map(Number);
  if (forceLevel === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (forceLevel === 'minor' || patch >= 9) {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

function bumpJsonFile(filePath, getVersion, setVersion, next) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(raw);
  const current = getVersion(json);
  if (current !== next.from) {
    throw new Error(`${filePath} is at ${current}, expected ${next.from} — fix the mismatch before bumping`);
  }
  setVersion(json, next.to);
  if (!dryRun) fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
  return current;
}

const appJsonPath = path.join(__dirname, '..', 'app.json');
const pkgJsonPath = path.join(__dirname, '..', 'package.json');

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const from = appJson.expo.version;
const to = nextVersion(from, force);

bumpJsonFile(appJsonPath, (j) => j.expo.version, (j, v) => (j.expo.version = v), { from, to });
bumpJsonFile(pkgJsonPath, (j) => j.version, (j, v) => (j.version = v), { from, to });

console.log(`${dryRun ? '[dry run] ' : ''}version: ${from} -> ${to}`);
