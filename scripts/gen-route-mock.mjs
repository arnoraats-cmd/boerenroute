/* Mock van de route-secties (maand-route + populaire routes) met echte data
   en CSS, om de nieuwe icoon-chips crisp te kunnen controleren. */
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { shopIcon, emojiIcon } from '../src/icons.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const routes = JSON.parse(readFileSync(join(root, 'src/data/routes.json'), 'utf8')).routes;
const shops  = JSON.parse(readFileSync(join(root, 'src/data/verifiedShops.json'), 'utf8'));
const find = id => shops.find(s => s.id === id);
const esc = s => String(s ?? '');

const featured = routes.find(r => r.featured) || routes[0];
const fstops = featured.stopIds.map(find).filter(Boolean);

const maandHome = `<div class="maandhome-card">
  <div class="maandhome-left">
    <div class="maandhome-badge">🗓️ Boerenroute van de maand · juni</div>
    <h2 class="maandhome-title"><span class="maandhome-title-ic">${emojiIcon(featured.emoji,{size:26})}</span>${esc(featured.titel)}</h2>
    <p class="maandhome-sub">${esc(featured.subtitel)}</p>
    <div class="maandhome-meta"><span class="maandhome-meta-item">📏 <strong>${esc(featured.afstand)}</strong></span><span class="maandhome-meta-item">📍 <strong>${fstops.length}</strong> stops</span></div>
  </div>
  <div class="maandhome-right">
    <div class="maandhome-stops-label">De route langs:</div>
    <ol class="maandhome-stops">${fstops.map((s,i)=>`<li class="maandhome-stop"><span class="maandhome-stop-num">${i+1}</span><span class="maandhome-stop-emoji">${shopIcon(s,{size:18})}</span><span class="maandhome-stop-name">${esc(s.name)}</span></li>`).join('')}</ol>
  </div>
</div>`;

const others = routes.filter(r => !r.featured).slice(0, 3);
const popular = others.map(route => {
  const stops = route.stopIds.map(find).filter(Boolean);
  const emojis = stops.map(s => `<span class="poproute-stopemoji" title="${esc(s.name)}">${shopIcon(s,{size:18})}</span>`).join('');
  return `<article class="poproute-card">
    <div class="poproute-top"><span class="poproute-emoji">${emojiIcon(route.emoji,{size:24})}</span><span class="poproute-prov">${esc(route.provincie)}</span></div>
    <h3 class="poproute-title">${esc(route.titel)}</h3>
    <p class="poproute-sub">${esc(route.subtitel)}</p>
    <div class="poproute-stopemojis">${emojis}</div>
    <div class="poproute-meta"><span>📏 ${esc(route.afstand)}</span><span>📍 ${stops.length} stops</span></div>
  </article>`;
}).join('');

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Lora:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles/main.css">
<style>body{background:#F8F4EC;padding:24px;font-family:'DM Sans',sans-serif}
.maandhome{margin-bottom:28px}.poproutes-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;max-width:980px}
h2.sec{font-family:'Lora',serif;color:#1C4109}*{animation:none!important}</style>
</head><body>
<h2 class="sec">Route van de maand</h2>
<div class="maandhome">${maandHome}</div>
<h2 class="sec">Meer mooie routes om te fietsen</h2>
<div class="poproutes-grid">${popular}</div>
</body></html>`;

writeFileSync(join(root,'route-mock.html'), html, 'utf8');
console.log('✓ route-mock.html');
