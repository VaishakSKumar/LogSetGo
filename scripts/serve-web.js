/**
 * Tiny static server for trying the built web app locally (no dependencies).
 *
 *   npm run preview:web                    # http://localhost:5000/
 *   npm run preview:web -- --base=LogSetGo   # mimic GitHub Pages' sub-path
 *
 * Build first with `npm run build:web` (EXPO_BASE_URL set to the same name as --base).
 */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const DIST = path.join(__dirname, '..', 'dist');
// Options come from flags (--base=LogSetGo --port=5000) or env (BASE, PORT).
// Flags avoid Git Bash on Windows rewriting values that start with "/".
const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const PORT = Number(flag('port') || process.env.PORT || 5000);
const BASE_NAME = (flag('base') || process.env.BASE || '').replace(/^\/+|\/+$/g, '');
const BASE = BASE_NAME ? `/${BASE_NAME}/` : '/';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!url.startsWith(BASE)) {
      res.writeHead(302, { Location: BASE });
      return res.end();
    }
    let rel = url.slice(BASE.length) || 'index.html';
    let file = path.join(DIST, rel);
    if (!file.startsWith(DIST)) {
      res.writeHead(403);
      return res.end();
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      if (path.extname(rel)) {
        res.writeHead(404);
        return res.end('Not found');
      }
      file = path.join(DIST, 'index.html'); // single-page app fallback
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`LogSetGo web preview: http://localhost:${PORT}${BASE}`));
