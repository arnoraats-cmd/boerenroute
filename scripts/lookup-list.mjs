/* ═══════════════════════════════════════════════════════════════
   lookup-list.mjs — zoek de adressen uit scripts/list-todo.json op via
   Google Places (Text Search), ontdubbel tegen de database, en schrijf
   kandidaten naar scripts/new-candidates.json (zelfde formaat als de
   ontdek-tool, zodat build-candidates.mjs ze kan verwerken).

   VEILIG: sleutel uit env. --limit N voor een testbatch.
     $env:GOOGLE_PLACES_KEY="JOUW_SLEUTEL"
     node scripts/lookup-list.mjs --limit 3
     node scripts/lookup-list.mjs
   ═══════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync } from 'fs';

const KEY = process.env.GOOGLE_PLACES_KEY;
if (!KEY) { console.error('Geen sleutel. Zet:  $env:GOOGLE_PLACES_KEY="JOUW_SLEUTEL"'); process.exit(1); }

const args = process.argv.slice(2);
let LIMIT = Infinity;
const li = args.indexOf('--limit');
if (li !== -1 && args[li + 1]) LIMIT = parseInt(args[li + 1], 10);

const todo     = JSON.parse(readFileSync('scripts/list-todo.json', 'utf8')).slice(0, LIMIT);
const existing = JSON.parse(readFileSync('src/data/verifiedShops.json', 'utf8'));
const existingPlaceIds = new Set(existing.filter(s => s.placeId).map(s => s.placeId));

function km(la1, lo1, la2, lo2) {
  const R = 6371, dLa = (la2-la1)*Math.PI/180, dLo = (lo2-lo1)*Math.PI/180;
  const x = Math.sin(dLa/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
  return R*2*Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}
const nearExisting = (lat, lng) => existing.some(s => km(s.lat, s.lng, lat, lng) < 0.15);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function search(q) {
  const body = JSON.stringify({ textQuery: q, languageCode: 'nl', regionCode: 'NL', maxResultCount: 1 });
  const headers = {
    'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.businessStatus',
  };
  for (let a = 1; a <= 4; a++) {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', { method: 'POST', headers, body });
    if (res.ok) return res;
    if (res.status === 403) return res;
    if ((res.status >= 500 || res.status === 429) && a < 4) { await sleep(1000 * a); continue; }
    return res;
  }
}

const found = new Map();
let calls = 0, geen = 0, dup = 0;

console.log(`Op te zoeken: ${todo.length}\n`);

for (const { name, town } of todo) {
  try {
    const res = await search(`${name} ${town}`);
    calls++;
    if (!res.ok) {
      console.log(`✗ ${name} — HTTP ${res.status}`);
      if (res.status === 403) { console.log('\n⚠ Gestopt (sleutel).'); break; }
      continue;
    }
    const p = (await res.json()).places?.[0];
    if (!p) { console.log(`∅ ${name} (${town}) — geen match`); geen++; continue; }
    const lat = p.location?.latitude, lng = p.location?.longitude;
    if (!lat || !lng) { geen++; continue; }
    if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') { console.log(`⊘ ${name} — ${p.businessStatus}`); continue; }
    if (existingPlaceIds.has(p.id) || found.has(p.id) || nearExisting(lat, lng)) { dup++; continue; }
    found.set(p.id, {
      name: p.displayName?.text ?? name, address: p.formattedAddress ?? '',
      lat, lng, placeId: p.id, primaryType: p.primaryType ?? '', queryName: name,
    });
    console.log(`✓ ${name} → ${p.displayName?.text ?? '?'} (${p.primaryType ?? '?'})`);
  } catch (e) {
    console.log(`✗ ${name} — ${e.message}`);
  }
  await sleep(250);
}

const candidates = [...found.values()].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
writeFileSync('scripts/new-candidates.json', JSON.stringify(candidates, null, 2) + '\n', 'utf8');
console.log(`\nKlaar. Calls: ${calls}. Nieuwe kandidaten: ${candidates.length} | geen match: ${geen} | al/dubbel: ${dup}.`);
console.log('Weggeschreven naar scripts/new-candidates.json.');
