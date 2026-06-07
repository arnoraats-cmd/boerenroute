/* ═══════════════════════════════════════════════════════════════
   import-selected.mjs — voegt handmatig geselecteerde middel-kandidaten
   (scripts/selected-pids.txt) toe aan verifiedShops.json.
   Zelfde afleiding als import-strong.mjs.
   Draai: node scripts/import-selected.mjs            (dry-run)
          node scripts/import-selected.mjs --write
   ═══════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync } from 'fs';

const WRITE = process.argv.includes('--write');
const shops = JSON.parse(readFileSync('src/data/verifiedShops.json', 'utf8'));
const mid   = JSON.parse(readFileSync('scripts/candidates-mid.json', 'utf8'));
const pids  = [...new Set(readFileSync('scripts/selected-pids.txt', 'utf8').split(/\s+/).map(s => s.trim()).filter(Boolean))];

const byPid = new Map(mid.map(x => [x.placeId, x]));
const existingPid = new Set(shops.filter(s => s.placeId).map(s => s.placeId));
const maxId = shops.reduce((m, s) => Math.max(m, +s.id || 0), 0);

const unmatched = pids.filter(p => !byPid.has(p));
const cand = pids.map(p => byPid.get(p)).filter(Boolean);

function cleanAddress(a) {
  let parts = (a || '').split(',').map(s => s.trim()).filter(Boolean);
  parts = parts.filter(p => !/^nederland$/i.test(p));
  const street = parts[0] || '';
  const last   = parts[parts.length - 1] || '';
  const city   = last.replace(/^\d{4}\s?[A-Z]{2}\s*/i, '').trim() || last;
  return { full: street && city ? `${street}, ${city}` : (a || ''), city };
}

function classify(name) {
  const n = name.toLowerCase();
  let type = 'winkel';
  if (/zelfpluk|pluktuin/.test(n))                      type = 'zelfpluk';
  else if (/automaat|eierhok|eierhuis|melktap/.test(n)) type = 'automaat';
  else if (/\bmarkt\b|boerenmarkt/.test(n))             type = 'markt';

  let emoji = '🛒', tags = [], products = [];
  const set = (e, t, p) => { emoji = e; tags = t; products = p; };
  if (/kaas|zuivel/.test(n))                            set('🧀', ['zuivel'], /kaas/.test(n) ? ['kaas'] : ['zuivel']);
  else if (/melktap|melk|ijsboerderij|\bijs\b/.test(n)) set(/ijs/.test(n) ? '🍦' : '🥛', ['zuivel'], /ijs/.test(n) ? ['boerderij-ijs'] : ['verse melk']);
  else if (/eier|\bei\b|eieren/.test(n))                set('🥚', ['eieren'], ['verse eieren']);
  else if (/asperge/.test(n))                           set('🌱', ['groente'], ['asperges']);
  else if (/aardappel/.test(n))                         set('🥕', ['groente'], ['aardappelen']);
  else if (/aardbei|bessen|\bbes\b|framboz|fruit|\bappel|peren|pruim/.test(n)) set('🍓', ['fruit'], ['fruit']);
  else if (/vlees|slager|angus|rund|varken|lam|gevogelte/.test(n)) set('🥩', ['vlees'], ['vlees']);
  else if (/honing|imker/.test(n))                      set('🍯', ['honing'], ['honing']);
  else if (/bloem/.test(n))                             set('🌷', [], ['bloemen']);
  else if (/groente|tuinder/.test(n))                   set('🥕', ['groente'], ['groente']);
  return { type, emoji, tags, products };
}

const TYPE_LABEL = { winkel: 'Boerderijwinkel', automaat: 'Automaat', markt: 'Boerenmarkt', zelfpluk: 'Zelfpluktuin' };

const seen = new Set();
const additions = [];
let id = maxId;
for (const c of cand) {
  if (!c.placeId || existingPid.has(c.placeId)) continue;
  const { full, city } = cleanAddress(c.address);
  const key = (c.name + '|' + city).toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  const { type, emoji, tags, products } = classify(c.name);
  const label = TYPE_LABEL[type];
  additions.push({
    id: ++id, emoji, name: c.name, type, premium: false, seasonal: false,
    lat: c.lat, lng: c.lng, address: full, hours: null, products, tags,
    placeId: c.placeId, googleRating: null, googleReviews: null, dagVers: null,
    desc: `${c.name}${city ? ' in ' + city : ''} — ${label.toLowerCase()} met ${products[0] || 'streekproducten'} rechtstreeks van de boer.`,
    osm: false,
  });
}

console.log(`Geselecteerd (uniek): ${pids.length} · gevonden in middel: ${cand.length} · niet-herkend: ${unmatched.length}`);
const byType = {}; additions.forEach(a => byType[a.type] = (byType[a.type] || 0) + 1);
console.log(`Toe te voegen (na ontdubbelen + reeds-bestaand): ${additions.length} · per type: ${JSON.stringify(byType)}`);
if (unmatched.length) console.log('Niet herkend:', unmatched.slice(0, 8));

if (WRITE) {
  writeFileSync('src/data/verifiedShops.json', JSON.stringify(shops.concat(additions), null, 2) + '\n', 'utf8');
  console.log(`\n✓ ${additions.length} toegevoegd. Totaal nu: ${shops.length + additions.length}.`);
} else {
  console.log('\n(dry-run — draai met --write)');
}
