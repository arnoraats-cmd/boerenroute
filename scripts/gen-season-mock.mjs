/* Mock van het seizoenskalender-raster met echte CSS, om de icoon-chips
   in context te zien. */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SEASONS } from '../src/season.js';
import { productIcon } from '../src/icons.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const items = SEASONS[6].items; // juni

const card = (item, idx) => `
  <button class="season-card" style="--i:${idx}">
    <span class="season-card-emoji">${productIcon(item, { size: 30 }) || '🌿'}</span>
    <span class="season-card-name">${item}</span>
    <span class="season-availbar">${Array.from({length:12},(_,i)=>`<span class="sab${i>=4&&i<=8?' sab-on':''}${i===5?' sab-cur':''}">${'JFMAMJJASOND'[i]}</span>`).join('')}</span>
    <span class="season-card-find">📍 Vind dichtbij</span>
  </button>`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Lora:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles/main.css">
<style>body{background:#F8F4EC;padding:24px;font-family:'DM Sans',sans-serif}
.season-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;max-width:880px}
h2{font-family:'Lora',serif;color:#1C4109}
*{animation:none!important;opacity:1!important;transform:none!important}</style>
</head><body>
<h2>Seizoenskalender — juni</h2>
<div class="season-page"><div class="season-grid">${items.map(card).join('')}</div></div>
</body></html>`;

writeFileSync(join(root, 'season-mock.html'), html, 'utf8');
console.log('✓ season-mock.html');
