/* ═══════════════════════════════════════════════════════════════
   import-strong.mjs — voegt candidates-strong.json toe aan
   verifiedShops.json met afgeleid datamodel.

   - type/emoji/tags/producten afgeleid uit naam (+ Google primaryType)
   - adres opgeschoond naar "Straat nr, Plaats"
   - coördinaten + placeId van Google hergebruikt
   - oplopende id's; ontdubbeld op placeId én naam+plaats
   Draai: node scripts/import-strong.mjs            (dry-run, toont plan)
          node scripts/import-strong.mjs --write    (schrijft door)
   ═══════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync } from 'fs';

const WRITE = process.argv.includes('--write');
const shops = JSON.parse(readFileSync('src/data/verifiedShops.json', 'utf8'));
const cand  = JSON.parse(readFileSync('scripts/candidates-strong.json', 'utf8'));

const existingPid = new Set(shops.filter(s => s.placeId).map(s => s.placeId));
const maxId = shops.reduce((m, s) => Math.max(m, +s.id || 0), 0);

/* "Verlorenhoek 1, 5446 XL Wanroij, Nederland" → {street, city, full} */
function cleanAddress(a) {
  let parts = (a || '').split(',').map(s => s.trim()).filter(Boolean);
  parts = parts.filter(p => !/^nederland$/i.test(p));
  const street = parts[0] || '';
  const last   = parts[parts.length - 1] || '';
  const city   = last.replace(/^\d{4}\s?[A-Z]{2}\s*/i, '').trim() || last;
  return { street, city, full: street && city ? `${street}, ${city}` : (a || '') };
}

/* Afleiding type/emoji/tags/producten uit de naam */
function classify(name) {
  const n = name.toLowerCase();
  let type = 'winkel';
  if (/zelfpluk|pluktuin/.test(n))                 type = 'zelfpluk';
  else if (/automaat|eierhok|eierhuis|melktap/.test(n)) type = 'automaat';
  else if (/\bmarkt\b|boerenmarkt/.test(n))        type = 'markt';

  let emoji = type === 'automaat' ? '🛒' : '🛒', tags = [], products = [];
  const set = (e, t, p) => { emoji = e; tags = t; products = p; };

  if (/kaas|zuivel/.test(n))                       set('🧀', ['zuivel'], /kaas/.test(n) ? ['kaas'] : ['zuivel']);
  else if (/melktap|melk|ijsboerderij|\bijs\b/.test(n)) set(/ijs/.test(n) ? '🍦' : '🥛', ['zuivel'], /ijs/.test(n) ? ['boerderij-ijs'] : ['verse melk']);
  else if (/eier|\bei\b|eieren/.test(n))           set('🥚', ['eieren'], ['verse eieren']);
  else if (/asperge/.test(n))                      set('🌱', ['groente'], ['asperges']);
  else if (/aardappel/.test(n))                    set('🥕', ['groente'], ['aardappelen']);
  else if (/aardbei|bessen|\bbes\b|framboz|fruit|\bappel|peren|pruim/.test(n)) set('🍓', ['fruit'], ['fruit']);
  else if (/vlees|slager|angus|rund|varken|lam|gevogelte/.test(n)) set('🥩', ['vlees'], ['vlees']);
  else if (/honing|imker/.test(n))                 set('🍯', ['honing'], ['honing']);
  else if (/bloem/.test(n))                        set('🌷', [], ['bloemen']);
  else if (/groente|tuinder/.test(n))              set('🥕', ['groente'], ['groente']);

  return { type, emoji, tags, products };
}

const TYPE_LABEL = { winkel: 'Boerderijwinkel', automaat: 'Automaat', markt: 'Boerenmarkt', zelfpluk: 'Zelfpluktuin' };

const seen = new Set();
const additions = [];
let id = maxId;

for (const c of cand) {
  if (!c.placeId || existingPid.has(c.placeId)) continue;
  const { street, city, full } = cleanAddress(c.address);
  const key = (c.name + '|' + city).toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);

  const { type, emoji, tags, products } = classify(c.name);
  const label = TYPE_LABEL[type];
  const desc = `${c.name}${city ? ' in ' + city : ''} — ${label.toLowerCase()} met ${products[0] || 'streekproducten'} rechtstreeks van de boer.`;

  additions.push({
    id: ++id,
    emoji,
    name: c.name,
    type,
    premium: false,
    seasonal: false,
    lat: c.lat,
    lng: c.lng,
    address: full,
    hours: null,
    products,
    tags,
    placeId: c.placeId,
    googleRating: null,
    googleReviews: null,
    dagVers: null,
    desc,
    osm: false,
  });
}

console.log(`Kandidaten: ${cand.length} · toe te voegen (na ontdubbelen): ${additions.length}`);
const byType = {};
additions.forEach(a => byType[a.type] = (byType[a.type] || 0) + 1);
console.log('Per type:', JSON.stringify(byType));
console.log('\nEerste 8:');
additions.slice(0, 8).forEach(a => console.log(`  #${a.id} ${a.emoji} ${a.name} [${a.type}/${a.tags.join(',') || '—'}] · ${a.address}`));

if (WRITE) {
  writeFileSync('src/data/verifiedShops.json', JSON.stringify(shops.concat(additions), null, 2) + '\n', 'utf8');
  console.log(`\n✓ ${additions.length} toegevoegd. Totaal nu: ${shops.length + additions.length}.`);
} else {
  console.log('\n(dry-run — draai met --write om door te schrijven)');
}
