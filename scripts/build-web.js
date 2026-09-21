/**
 * Builds the installable web app (PWA) into dist/.
 *
 *   npm run build:web
 *   EXPO_BASE_URL=LogSetGo npm run build:web      # when hosted under a sub-path (GitHub Pages)
 *
 * 1. expo export --platform web
 * 2. make sure public/ (manifest, icons, sw.js) is in dist/
 * 3. add the manifest / theme / iOS "add to home screen" tags to index.html
 * 4. give the service worker a precache list and a per-build version
 */
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');

const fail = (msg) => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};

// 1. export
console.log(`▶ expo export --platform web${process.env.EXPO_BASE_URL ? `  (base ${process.env.EXPO_BASE_URL})` : ''}`);
fs.rmSync(DIST, { recursive: true, force: true });
const r = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', 'dist'], { cwd: ROOT, stdio: 'inherit', shell: true });
if (r.status !== 0) fail('expo export failed');

// 2. public/ files (Expo copies them; this only fills gaps)
const copyMissing = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyMissing(src, dst);
    else if (!fs.existsSync(dst)) fs.copyFileSync(src, dst);
  }
};
copyMissing(PUBLIC, DIST);

// 3. index.html
const indexPath = path.join(DIST, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('rel="manifest"')) {
  const tags = [
    '<link rel="manifest" href="manifest.webmanifest" />',
    '<meta name="theme-color" content="#000000" />',
    '<meta name="description" content="Track. Rest. Progress." />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-title" content="LogSetGo" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black" />',
    '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />',
  ].join('\n    ');
  if (!html.includes('</head>')) fail('index.html has no </head>');
  html = html.replace('</head>', `    ${tags}\n  </head>`);
  fs.writeFileSync(indexPath, html);
}

// 4. service worker: precache everything in dist except itself and build metadata
const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(path.relative(DIST, full).split(path.sep).join('/'));
  }
};
walk(DIST);
const precache = files.filter((f) => f !== 'sw.js' && f !== 'metadata.json' && !f.endsWith('.map')).sort();
const version = crypto
  .createHash('sha1')
  .update(precache.map((f) => `${f}:${fs.statSync(path.join(DIST, f)).size}`).join('|'))
  .digest('hex')
  .slice(0, 10);

const swPath = path.join(DIST, 'sw.js');
if (!fs.existsSync(swPath)) fail('sw.js is missing from dist (expected from public/)');
let sw = fs.readFileSync(swPath, 'utf8');
// Replace the exact code tokens (not mentions in comments).
const VERSION_TOKEN = "const VERSION = '__VERSION__';";
const PRECACHE_TOKEN = 'const PRECACHE = __PRECACHE__;';
if (!sw.includes(VERSION_TOKEN) || !sw.includes(PRECACHE_TOKEN)) fail('sw.js placeholders not found');
sw = sw.replace(VERSION_TOKEN, `const VERSION = '${version}';`).replace(PRECACHE_TOKEN, `const PRECACHE = ${JSON.stringify(precache, null, 2)};`);
if (sw.includes('__VERSION__') && sw.includes("'__VERSION__'")) fail('sw.js still has an unfilled placeholder');
fs.writeFileSync(swPath, sw);

// sanity checks so a broken build can't slip through
for (const must of ['index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png']) {
  if (!precache.includes(must)) fail(`dist is missing ${must}`);
}
if (!precache.some((f) => f.startsWith('_expo/static/js/web/') && f.endsWith('.js'))) fail('dist is missing the JS bundle');

console.log(`✔ dist ready: ${precache.length} files precached, service worker ${version}`);
