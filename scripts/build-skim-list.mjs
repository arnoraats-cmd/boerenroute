/* ═══════════════════════════════════════════════════════════════
   build-skim-list.mjs — maakt een klikbare skim-lijst (HTML) van de
   middel-tier, ná het strippen van kettingen + ruis-types.
   Open scripts/skim-mid.html in je browser, vink de echte winkels aan,
   klik "Kopieer geselecteerde" en plak de codes terug.
   ═══════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync } from 'fs';

const mid = JSON.parse(readFileSync('scripts/candidates-mid.json', 'utf8'));

/* Ruis-types die zeker geen verkooppunt zijn */
const NOISE = new Set([
  'bed_and_breakfast','lodging','farmstay','campground','rv_park','restaurant',
  'pizza_restaurant','diner','pub','night_club','tea_house','coffee_shop','bar',
  'medical_clinic','health','pet_store','pet_boarding_service','event_venue',
  'tourist_attraction','sports_activity_location','corporate_office','florist',
  'association_or_organization','manufacturer','wholesaler','home_goods_store','winery',
]);

/* Kettingen / niet-boerderij retail (naam-prefix, kleine letters) */
const CHAINS = ['alexanderhoeve'];

const place = a => (a || '').match(/\d{4}\s?[A-Z]{2}\s+([\w\-' .]+)/)?.[1]?.trim()
              || (a || '').split(',').slice(-2, -1)[0]?.trim() || '';

const seen = new Set();
const rows = mid
  .filter(x => !NOISE.has(x.primaryType || ''))
  .filter(x => !CHAINS.some(c => (x.name || '').toLowerCase().includes(c)))
  .filter(x => { const k = (x.name + '|' + place(x.address)).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
  .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'nl'));

const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const maps = x => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.name + ' ' + (x.address||''))}${x.placeId ? '&query_place_id=' + x.placeId : ''}`;

const items = rows.map((x, i) => `
  <li class="row">
    <input type="checkbox" id="c${i}" data-pid="${esc(x.placeId)}">
    <label for="c${i}">
      <span class="nm">${esc(x.name)}</span>
      <span class="meta">${esc(place(x.address))} · <em>${esc(x.primaryType || '?')}</em></span>
    </label>
    <a class="mp" href="${esc(maps(x))}" target="_blank" rel="noopener">Maps ↗</a>
  </li>`).join('');

const html = `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Skim-lijst middel-tier (${rows.length})</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 20px; background: #F8F4EC; color: #1A1A18; }
  h1 { font-size: 1.4rem; }
  .bar { position: sticky; top: 0; background: #F8F4EC; padding: 12px 0; border-bottom: 1px solid #ccc; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  button { background: #356611; color: #fff; border: 0; border-radius: 8px; padding: 9px 16px; font-weight: 600; cursor: pointer; }
  .count { font-weight: 700; }
  ul { list-style: none; padding: 0; }
  .row { display: flex; align-items: center; gap: 10px; padding: 8px 6px; border-bottom: 1px solid #e7e0d2; }
  .row input { width: 20px; height: 20px; flex-shrink: 0; }
  label { flex: 1; cursor: pointer; }
  .nm { font-weight: 600; }
  .meta { display: block; font-size: .8rem; color: #666; }
  .mp { font-size: .8rem; color: #356611; white-space: nowrap; }
  textarea { width: 100%; height: 80px; margin-top: 8px; }
</style></head><body>
<h1>Skim-lijst — middel-tier (${rows.length})</h1>
<p>Vink aan wat een <strong>echt verkooppunt</strong> is (boerderijwinkel/automaat/zelfpluk). Twijfel? Klik "Maps ↗". Klik daarna <strong>Kopieer geselecteerde</strong> en plak het blok terug in de chat.</p>
<div class="bar">
  <button onclick="copySel()">📋 Kopieer geselecteerde</button>
  <span class="count" id="cnt">0 geselecteerd</span>
</div>
<ul>${items}</ul>
<textarea id="out" placeholder="Hier komen de geselecteerde codes…"></textarea>
<script>
  const boxes = [...document.querySelectorAll('input[type=checkbox]')];
  const upd = () => document.getElementById('cnt').textContent = boxes.filter(b=>b.checked).length + ' geselecteerd';
  boxes.forEach(b => b.addEventListener('change', upd));
  function copySel() {
    const sel = boxes.filter(b=>b.checked).map(b=>b.dataset.pid).join('\\n');
    document.getElementById('out').value = sel;
    navigator.clipboard?.writeText(sel);
    alert(boxes.filter(b=>b.checked).length + ' gekopieerd. Plak terug in de chat.');
  }
</script></body></html>`;

writeFileSync('scripts/skim-mid.html', html, 'utf8');
console.log(`Skim-lijst: ${rows.length} kandidaten (van ${mid.length} middel) → scripts/skim-mid.html`);
