/* Bakt een self-contained review-sheet (geen module-import nodig) zodat
   Chrome headless 'm kan screenshotten. Toont elk icoon groot (inkt),
   als groen lijst-chip, en als witte glyph op de 4 type-pinnen. */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { shopIcon } from '../src/icons.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const PIN = { winkel: '#64748B', automaat: '#2563EB', markt: '#92400E', onderweg: '#7C3AED' };
const EMOJI = {
  cheese: ['🧀', '🧈'], milk: ['🥛', '🐄', '🐐', '🐑'], egg: ['🥚', '🍗'],
  berry: ['🍓', '🍒', '🫐'], apple: ['🍎'], carrot: ['🥕', '🥬', '🥔', '🍄'],
  meat: ['🥩', '🐗'], grain: ['🌾'], sprout: ['🌱', '🌿', '🌷', '🌸'],
  honey: ['🍯'], icecream: ['🍦'], basket: ['🛒', '🪙'], playground: ['🛝'],
};

const cards = Object.keys(EMOJI).map(key => {
  const s = { emoji: EMOJI[key][0] };
  const big  = shopIcon(s, { size: 56, sw: 1.7 });
  const chip = shopIcon(s, { size: 26, sw: 1.7 });
  const pins = Object.entries(PIN).map(([t, c]) =>
    `<span class="pin" style="background:${c}">${shopIcon(s, { size: 16, stroke: '#fff', sw: 1.8 })}</span>`
  ).join('');
  return `<div class="card"><h3>${key}</h3>
    <div class="row"><span class="big">${big}</span><span class="chip">${chip}</span><span class="pins">${pins}</span></div>
    <div class="em">${EMOJI[key].join(' ')}</div></div>`;
}).join('');

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
:root{--green-dark:#1C4109;--green-bg:#E7F0D6;--sand:#F8F4EC;--text:#1A1A18;--mid:#555550}
*{box-sizing:border-box}body{margin:0;background:var(--sand);color:var(--text);font-family:system-ui,sans-serif;padding:24px}
h1{margin:0 0 18px;color:var(--green-dark);font-size:20px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.card{background:#fff;border:1px solid var(--green-bg);border-radius:12px;padding:12px}
.card h3{margin:0 0 10px;font-size:13px;color:var(--green-dark);text-transform:capitalize}
.row{display:flex;align-items:center;gap:12px}
.big{color:var(--green-dark)}
.chip{width:42px;height:42px;border-radius:11px;background:var(--green-bg);display:flex;align-items:center;justify-content:center;color:var(--green-dark);flex:none}
.pins{display:flex;gap:6px}
.pin{width:30px;height:30px;border-radius:50%;border:2.5px solid rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.28)}
.em{margin-top:9px;font-size:13px;color:var(--mid)}
svg{display:block}
</style></head><body>
<h1>Boerenroute — icoonset review (inkt · lijst-chip · kaart-pins)</h1>
<div class="grid">${cards}</div>
</body></html>`;

writeFileSync(join(root, 'icon-review.html'), html, 'utf8');
console.log('✓ icon-review.html geschreven');
