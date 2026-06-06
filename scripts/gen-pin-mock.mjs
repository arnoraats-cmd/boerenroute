/* Mock van de kaartmarkers (logo-pin per type) op een kaart-achtige
   achtergrond, om de vorm/leesbaarheid te controleren. */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { shopIcon } from '../src/icons.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const COLOR = { winkel:'#64748B', automaat:'#2563EB', markt:'#92400E', onderweg:'#7C3AED', route:'#3B6D11' };

const samples = [
  ['winkel',   { emoji:'🧀' }, 'Kaaswinkel'],
  ['automaat', { emoji:'🥚' }, 'Eierautomaat'],
  ['winkel',   { emoji:'🍓' }, 'Zelfpluk'],
  ['winkel',   { emoji:'🥕' }, 'Groente'],
  ['markt',    { emoji:'🍯' }, 'Markt/honing'],
  ['winkel',   { emoji:'🥩' }, 'Slager'],
  ['onderweg', { emoji:'🛝' }, 'Kids'],
  ['winkel',   { emoji:'🥛' }, 'Melktap'],
];

function pin(type, shop, hl, routeNum) {
  const bg  = routeNum ? COLOR.route : COLOR[type];
  const w   = (hl || routeNum) ? 36 : 28;
  const h   = Math.round(w * 30 / 26);
  const gsz = Math.round(w * 0.52);
  const inner = routeNum
    ? `<span style="position:absolute;left:50%;top:41%;transform:translate(-50%,-50%);color:#fff;font-weight:700;font-size:${hl?'15px':'13px'};font-family:system-ui">${routeNum}</span>`
    : `<span style="position:absolute;left:50%;top:41%;transform:translate(-50%,-50%);display:flex">${shopIcon(shop,{size:gsz,stroke:'#fff',sw:1.9})}</span>`;
  const shadow = hl ? 'drop-shadow(0 4px 6px rgba(0,0,0,.4))' : 'drop-shadow(0 2px 3px rgba(0,0,0,.35))';
  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 26 30" fill="none" style="display:block;filter:${shadow}"><path d="M13 1.4C6.5 1.4 1.4 6.4 1.4 12.5c0 6.7 8.3 14.6 11 16.9.35.3.85.3 1.2 0 2.7-2.3 11-10.2 11-16.9C24.6 6.4 19.5 1.4 13 1.4Z" fill="${bg}" stroke="#fff" stroke-width="${hl?2:1.7}"/></svg>`;
  return `<div style="position:relative;width:${w}px;height:${h}px">${svg}${inner}</div>`;
}

const cell = (type, shop, label) => `<div class="cell">
  <div class="pins">${pin(type,shop,false)}${pin(type,shop,true)}</div>
  <div class="lab">${label}</div></div>`;

const route = `<div class="cell"><div class="pins">${[1,2,3].map(n=>pin('route',{},false,n)).join('')}${pin('route',{},true,4)}</div><div class="lab">In route (genummerd)</div></div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;font-family:system-ui,sans-serif}
.map{background:
  linear-gradient(0deg,rgba(0,0,0,.03),rgba(0,0,0,.03)),
  repeating-linear-gradient(45deg,#eef3e6 0 22px,#e7eede 22px 44px);
  padding:28px}
h2{margin:0 0 16px;color:#1C4109;font-family:Georgia,serif}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;max-width:760px}
.cell{background:rgba(255,255,255,.55);border-radius:12px;padding:14px;display:flex;flex-direction:column;align-items:center;gap:10px}
.pins{display:flex;align-items:flex-end;gap:18px;min-height:42px}
.lab{font-size:13px;color:#333}
</style></head><body><div class="map">
<h2>Kaartmarkers — logo-pin per type (normaal + uitgelicht)</h2>
<div class="grid">${samples.map(s=>cell(...s)).join('')}${route}</div>
</div></body></html>`;

writeFileSync(join(root,'pin-mock.html'), html, 'utf8');
console.log('✓ pin-mock.html');
