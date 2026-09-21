/**
 * QA Tier 4 (SIT): prove the app compiles to a real native bundle on both platforms.
 * Exports iOS and Android (Hermes bytecode) into a throwaway folder, then deletes it.
 * Exit code is non-zero if either platform fails, so it can gate a commit.
 */
const { spawnSync } = require('node:child_process');
const { rmSync } = require('node:fs');

const OUT = '.export-check';
let failed = false;

for (const platform of ['ios', 'android']) {
  console.log(`\n▶ expo export --platform ${platform}`);
  const r = spawnSync('npx', ['expo', 'export', '--platform', platform, '--output-dir', OUT], {
    stdio: 'inherit',
    shell: true,
  });
  if (r.status !== 0) {
    console.error(`✖ ${platform} bundle FAILED`);
    failed = true;
    break;
  }
  console.log(`✔ ${platform} bundle OK`);
}

rmSync(OUT, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
