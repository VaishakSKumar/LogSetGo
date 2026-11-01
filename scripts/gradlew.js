#!/usr/bin/env node
/**
 * Runs the Gradle wrapper from android/ on any OS. npm uses cmd.exe on Windows, which can't run
 * "./gradlew", and prebuild --clean deletes local.properties, so the SDK path comes from here.
 *   node ../scripts/gradlew.js assembleRelease
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const windows = process.platform === 'win32';
const sdkDefault = windows
  ? path.join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk')
  : path.join(os.homedir(), process.platform === 'darwin' ? 'Library/Android/sdk' : 'Android/Sdk');
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || sdkDefault;

if (!fs.existsSync(sdk)) {
  console.error(`Android SDK not found at ${sdk}. Install it with Android Studio, or set ANDROID_HOME.`);
  process.exit(1);
}

const result = spawnSync(windows ? '.\\gradlew.bat' : './gradlew', process.argv.slice(2), {
  stdio: 'inherit',
  shell: windows,
  env: { ...process.env, ANDROID_HOME: sdk },
});
process.exit(result.status ?? 1);
