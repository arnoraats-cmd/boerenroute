/* Toont elk uniek seizoensproduct met zijn eigen icoon (of 'emoji' als er
   geen eigen icoon is) — groene chip, zoals in de kalender. */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SEASONS } from '../src/season.js';
import { productIcon } from '../src/icons.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const all = new Set();
for (const m of Object.values(SEASONS)) m.items.forEach(i => all.add(i));
const products = [...all].sort((a, b) => a.localeCompare(b, 'nl'));

const cell = name => {
  const ic = productIcon(name, { size: 30 });
  const body = ic
    ? `<span class="chip">${ic}</span>`
    : `<span class="chip emoji">·</span>`;
  return `<div class="cell">${body}<span class="nm">${name}</span>${ic ? '' : '<span class="fb">emoji</span>'}</div>`;
};

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
:root{--green-dark:#1C4109;--green-bg:#E7F0D6;--sand:#F8F4EC;--mid:#555}
body{margin:0;background:var(--sand);font-family:system-ui,sans-serif;padding:24px;color:#1A1A18}
h2{color:var(--green-dark);font-family:Georgia,serif;margin:0 0 16px}
.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.cell{background:#fff;border:1px solid var(--green-bg);border-radius:12px;padding:10px;display:flex;flex-direction:column;align-items:center;gap:7px;position:relative}
.chip{width:46px;height:46px;border-radius:12px;background:var(--green-bg);color:var(--green-dark);display:inline-flex;align-items:center;justify-content:center}
.chip.emoji{background:#f3d9d9;color:#a33}
.nm{font-size:12px;text-align:center;color:#333}
.fb{position:absolute;top:4px;right:6px;font-size:9px;color:#a33}
svg{display:block}
</style></head><body>
<h2>Seizoensproducten — eigen groente/fruit-iconen (${products.length} stuks)</h2>
<div class="grid">${products.map(cell).join('')}</div>
</body></html>`;

writeFileSync(join(root, 'produce-review.html'), html, 'utf8');
console.log('✓ produce-review.html —', products.length, 'producten');
