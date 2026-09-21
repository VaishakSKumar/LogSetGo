/**
 * Generates every app icon from one piece of geometry: a green "logged set" check hub
 * with barbell plates either side, on true black.
 *
 *   npm run icons
 *
 * Writes into assets/. Requires `sharp` (devDependency).
 */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ASSETS = path.join(__dirname, '..', 'assets');
const BRANDING = path.join(ASSETS, 'branding');

const GREEN = '#30D158';
const BLACK = '#000000';
const PLATE = '#FFFFFF';
const BAR = '#48484A';

/**
 * @param {object} o
 * @param {string|null} o.bg     background fill, or null for transparent
 * @param {number} [o.scale]     shrink the artwork about the centre (Android's adaptive safe zone)
 * @param {boolean} [o.mono]     single-colour (white) version for Android themed icons
 */
function svg({ bg, scale = 1, mono = false }) {
  const plate = mono ? '#FFFFFF' : PLATE;
  const bar = mono ? '#FFFFFF' : BAR;
  const hub = mono ? '#FFFFFF' : GREEN;
  const check = 'M436 520 L490 574 L594 452';

  // Plates: a tall inner plate and a shorter outer plate, mirrored around the vertical centre line.
  const plates = [
    { x: 232, y: 302, w: 70, h: 420, r: 26 },
    { x: 152, y: 362, w: 56, h: 300, r: 22 },
  ];
  const mirror = (p) => ({ ...p, x: 1024 - p.x - p.w });
  const rect = (p) => `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${p.r}" fill="${plate}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : ''}
  <defs>
    <mask id="cut"><rect width="1024" height="1024" fill="#fff"/><path d="${check}" fill="none" stroke="#000" stroke-width="50" stroke-linecap="round" stroke-linejoin="round"/></mask>
  </defs>
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <rect x="140" y="498" width="744" height="28" rx="14" fill="${bar}"/>
    ${plates.map(rect).join('\n    ')}
    ${plates.map((p) => rect(mirror(p))).join('\n    ')}
    <circle cx="512" cy="512" r="172" fill="${hub}" ${mono ? 'mask="url(#cut)"' : ''}/>
    ${mono ? '' : `<path d="${check}" fill="none" stroke="${BLACK}" stroke-width="50" stroke-linecap="round" stroke-linejoin="round"/>`}
  </g>
</svg>
`;
}

async function png(file, markup, size = 1024, { flatten = false } = {}) {
  let img = sharp(Buffer.from(markup)).resize(size, size);
  if (flatten) img = img.flatten({ background: BLACK }).removeAlpha();
  await img.png({ compressionLevel: 9 }).toFile(path.join(ASSETS, file));
  console.log(`✔ ${file} (${size}×${size})`);
}

(async () => {
  fs.mkdirSync(BRANDING, { recursive: true });
  fs.writeFileSync(path.join(BRANDING, 'logo.svg'), svg({ bg: BLACK }));
  console.log('✔ branding/logo.svg');

  // iOS: full-bleed, fully opaque (the OS applies the rounded mask).
  await png('icon.png', svg({ bg: BLACK }), 1024, { flatten: true });

  // Android adaptive icon: artwork stays inside the ~66% safe zone.
  await png('android-icon-foreground.png', svg({ bg: null, scale: 0.8 }));
  await png('android-icon-background.png', `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${BLACK}"/></svg>`, 1024, { flatten: true });
  await png('android-icon-monochrome.png', svg({ bg: null, scale: 0.8, mono: true }));

  // Launch screen (the screen itself is black) and browser tab.
  await png('splash-icon.png', svg({ bg: null }));
  await png('favicon.png', svg({ bg: BLACK }), 256, { flatten: true });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
