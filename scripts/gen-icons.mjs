/* Genereert PNG-iconen zonder externe dependencies — puur Node.js + zlib */
import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

/* ── CRC32 ────────────────────────────────────────────────── */
const CRC = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  CRC[i] = c;
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* ── PNG-chunk ────────────────────────────────────────────── */
function chunk(type, data) {
  const t   = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

/* ── PNG encoder ─────────────────────────────────────────── */
function makePNG(w, h, pixelFn) {
  const sig  = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8]=8; ihdr[9]=6; // RGBA

  const stride = 1 + w * 4;
  const raw    = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const [r,g,b,a] = pixelFn(x, y, w, h);
      const off = y * stride + 1 + x * 4;
      raw[off]=r; raw[off+1]=g; raw[off+2]=b; raw[off+3]=a;
    }
  }
  return Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT',deflateSync(raw,{level:6})), chunk('IEND',Buffer.alloc(0))]);
}

/* ── Kleuren ─────────────────────────────────────────────── */
const G_DARK  = [39, 80, 10];
const G_MID   = [59, 109, 17];
const G_LIGHT = [99, 153, 34];
const G_BG    = [234, 243, 222];
const AMBER   = [186, 117, 23];
const WHITE   = [255, 255, 255];

/* Lineaire interpolatie */
const lerp = (a, b, t) => Math.round(a + (b-a)*t);

/* Afgeronde hoek mask */
function roundRect(x, y, w, h, r) {
  const dx = Math.max(0, Math.max(r-x, x-(w-r)));
  const dy = Math.max(0, Math.max(r-y, y-(h-r)));
  return Math.sqrt(dx*dx + dy*dy) <= r;
}

/* ── App-icoon: groene afgeronde vierkant met graanstengel ─ */
function iconPixel(x, y, w, h) {
  const rad = w * 0.22; // corner radius

  // Buiten afgerond vierkant → transparant
  if (!roundRect(x, y, w, h, rad)) return [0,0,0,0];

  // Gradient achtergrond: donkergroen → midgroen
  const t   = y / h;
  const bg  = [lerp(G_DARK[0],G_MID[0],t), lerp(G_DARK[1],G_MID[1],t), lerp(G_DARK[2],G_MID[2],t), 255];

  // Genormaliseerde coördinaten (-1..1)
  const nx = (x / w) * 2 - 1;
  const ny = (y / h) * 2 - 1;

  // Stengel: dunne verticale rechthoek
  const stalk = Math.abs(nx) < 0.055 && ny > -0.15 && ny < 0.62;

  // Graankorrels: kleine horizontale ellipsen
  function grain(cx, cy, rx, ry) {
    return ((nx-cx)**2/rx**2 + (ny-cy)**2/ry**2) < 1;
  }
  const g1 = grain( 0.00, -0.44, 0.13, 0.16);  // top
  const g2 = grain(-0.18, -0.24, 0.10, 0.14);  // links
  const g3 = grain( 0.18, -0.24, 0.10, 0.14);  // rechts
  const g4 = grain(-0.13, -0.04, 0.09, 0.13);  // midden-links
  const g5 = grain( 0.13, -0.04, 0.09, 0.13);  // midden-rechts
  const g6 = grain( 0.00,  0.14, 0.09, 0.13);  // midden

  if (stalk || g1 || g2 || g3 || g4 || g5 || g6) {
    const brightness = ny < -0.3 ? 1.0 : 0.92;
    return [Math.round(WHITE[0]*brightness), Math.round(WHITE[1]*brightness), Math.round(WHITE[2]*brightness), 255];
  }

  return bg;
}

/* ── OG-image: 1200×630, landelijk verloop + tekstgebied ── */
function ogPixel(x, y, w, h) {
  // Basis: donkergroen diagonaal verloop
  const t  = (x/w * 0.4 + y/h * 0.6);
  const r  = lerp(G_DARK[0], G_MID[0], t);
  const g  = lerp(G_DARK[1], G_MID[1], t);
  const b  = lerp(G_DARK[2], G_MID[2], t);

  // Subtiele hooglicht in linker bovenhoek
  const dx = x/w, dy = y/h;
  const glow = Math.max(0, 1 - Math.sqrt(dx*dx + dy*dy) * 2.5);
  const rl   = Math.round(r + glow * 20);
  const gl2  = Math.round(g + glow * 30);

  // Wit blok rechts voor tekst (placeholder zone)
  if (x > w * 0.55 && x < w * 0.97 && y > h * 0.12 && y < h * 0.88) {
    const fade = Math.max(0, Math.min(1, (x - w*0.55) / (w * 0.06)));
    const wa   = Math.round(fade * 255 * 0.12);
    return [Math.round(r + (255-r)*fade*0.12), Math.round(g + (255-g)*fade*0.12), Math.round(b + (255-b)*fade*0.12), 255];
  }

  return [Math.min(255,rl), Math.min(255,gl2), b, 255];
}

/* ── Genereer bestanden ───────────────────────────────────── */
mkdirSync(join(root, 'public/icons'), { recursive: true });

const icons = [
  { path: 'public/icons/icon-192.png',         w: 192,  h: 192,  fn: iconPixel },
  { path: 'public/icons/icon-512.png',         w: 512,  h: 512,  fn: iconPixel },
  { path: 'public/icons/apple-touch-icon.png', w: 180,  h: 180,  fn: iconPixel },
  { path: 'public/og-image.png',               w: 1200, h: 630,  fn: ogPixel   },
];

for (const { path, w, h, fn } of icons) {
  const buf = makePNG(w, h, fn);
  writeFileSync(join(root, path), buf);
  console.log(`✓ ${path}  (${w}×${h}, ${(buf.length/1024).toFixed(1)} KB)`);
}

console.log('\nKlaar.');
