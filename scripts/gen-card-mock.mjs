/* Mock van de echte componenten (kaart, popup, modal-header) met de nieuwe
   icoon-chip, zodat we de styling visueel kunnen controleren. */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { shopIcon } from '../src/icons.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const shops = [
  { emoji: '🧀', name: "Siebe's Kaas", address: 'Kraanmeer 15, Erp', tags: ['zuivel'] },
  { emoji: '🥚', name: 'Eierautomaat De Hoeve', address: 'Dorpsstraat 8, Uden', tags: ['eieren'] },
  { emoji: '🍓', name: 'Zelfpluk Aardbeienland', address: 'Akkerweg 2, Veghel', tags: ['fruit'] },
  { emoji: '🥕', name: 'Groentetuin Bert', address: 'Heiweg 44, Boekel', tags: ['groente'] },
  { emoji: '🍯', name: 'Imkerij De Lindehof', address: 'Bosrand 1, Liempde', tags: ['honing'] },
  { emoji: '🥩', name: 'Boerderijslager Jansen', address: 'Stalweg 7, Sint-Oedenrode', tags: ['vlees'] },
];

const card = s => `<li class="shop-card">
  <button class="shop-fav">♡</button>
  <div class="shop-card-header">
    <span class="shop-emoji">${shopIcon(s, { size: 26 })}</span>
    <div class="shop-info"><div class="shop-name">${s.name}</div><div class="shop-address">${s.address}</div></div>
  </div>
  <div class="shop-meta"><span class="shop-tag">${s.tags[0]}</span><span class="shop-dist">2,4 km</span></div>
  <button class="card-route-btn">+ Route</button>
</li>`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Lora:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles/main.css">
<style>
body{background:#F8F4EC;padding:24px;font-family:'DM Sans',sans-serif}
.shopList{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:1100px}
h2{font-family:'Lora',serif;color:#1C4109}
.mockrow{display:flex;gap:24px;align-items:flex-start;margin-top:24px;flex-wrap:wrap}
.popup-card{background:#fff;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.15);padding:12px;width:248px}
.modal-card{background:#fff;border-radius:16px;box-shadow:0 6px 24px rgba(0,0,0,.15);padding:18px;width:340px}
</style></head><body>
<h2>Winkelkaarten</h2>
<ul class="shopList">${shops.map(card).join('')}</ul>
<div class="mockrow">
  <div>
    <h2>Kaart-popup</h2>
    <div class="popup-card"><div class="map-popup"><div class="popup-top">
      <span class="popup-emoji">${shopIcon(shops[0], { size: 22 })}</span>
      <div class="popup-info"><div class="popup-name">${shops[0].name}</div><div class="popup-addr">${shops[0].address}</div></div>
    </div></div></div>
  </div>
  <div>
    <h2>Detail-modal header</h2>
    <div class="modal-card"><div class="modal-head" style="display:flex;gap:14px;align-items:center">
      <span class="modal-emoji">${shopIcon(shops[4], { size: 34, sw: 1.6 })}</span>
      <div><div class="modal-title" style="font-family:'Lora',serif;font-size:20px;color:#1C4109">${shops[4].name}</div>
      <div style="color:#555">${shops[4].address}</div></div>
    </div></div>
  </div>
</div>
</body></html>`;

writeFileSync(join(root, 'card-mock.html'), html, 'utf8');
console.log('✓ card-mock.html');
