/* ═══════════════════════════════════════════════════════════════
   find-kidfarms.mjs — zoek speelboerderijen / kindvriendelijke
   boerderij-uitjes via Google Places, ontdubbel tegen de database,
   schrijf kandidaten naar scripts/kidfarm-candidates.json.

     $env:GOOGLE_PLACES_KEY="JOUW_SLEUTEL"
     node scripts/find-kidfarms.mjs --limit 2   # test
     node scripts/find-kidfarms.mjs             # volledig
   ═══════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync } from 'fs';

const KEY = process.env.GOOGLE_PLACES_KEY;
if (!KEY) { console.error('Geen sleutel. Zet:  $env:GOOGLE_PLACES_KEY="JOUW_SLEUTEL"'); process.exit(1); }

const args = process.argv.slice(2);
let LIMIT = Infinity;
const li = args.indexOf('--limit');
if (li !== -1 && args[li + 1]) LIMIT = parseInt(args[li + 1], 10);

const QUERIES = ['speelboerderij', 'belevenisboerderij', 'doeboerderij', 'beleefboerderij', 'boerderij met speeltuin'];

const GRID = [];
for (let lat = 50.75; lat <= 53.5; lat += 0.4)
  for (let lng = 3.4; lng <= 7.1; lng += 0.45)
    GRID.push({ lat: +lat.toFixed(3), lng: +lng.toFixed(3) });
const points = GRID.slice(0, LIMIT);

/* Relevantie: het moet echt een kindvriendelijk boerderij-uitje zijn */
const RELEVANT = /boerderij|speeltuin|speel|beleef|belevenis|doeboerderij|dieren|kinderboerderij|kinderpret|hoeve/i;
const SKIP     = /manege|ruiter|paardrij|hotel|restaurant only/i;

const existing = JSON.parse(readFileSync('src/data/verifiedShops.json', 'utf8'));
const existingPlaceIds = new Set(existing.filter(s => s.placeId).map(s => s.placeId));
const km = (la1, lo1, la2, lo2) => {
  const R = 6371, dLa = (la2-la1)*Math.PI/180, dLo = (lo2-lo1)*Math.PI/180;
  const x = Math.sin(dLa/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
  return R*2*Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
};
const nearExisting = (lat, lng) => existing.some(s => km(s.lat, s.lng, lat, lng) < 0.15);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function search(q, pt) {
  const body = JSON.stringify({ textQuery: q, languageCode: 'nl', regionCode: 'NL', maxResultCount: 20,
    locationBias: { circle: { center: { latitude: pt.lat, longitude: pt.lng }, radius: 30000 } } });
  const headers = { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.businessStatus' };
  for (let a = 1; a <= 4; a++) {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', { method: 'POST', headers, body });
    if (res.ok) return res;
    if (res.status === 403) return res;
    if ((res.status >= 500 || res.status === 429) && a < 4) { await sleep(1000 * a); continue; }
    return res;
  }
}

const found = new Map();
let calls = 0;
console.log(`Raster: ${points.length} punten × ${QUERIES.length} zoektermen = max ${points.length * QUERIES.length} calls\n`);

for (const pt of points) {
  for (const q of QUERIES) {
    try {
      const res = await search(q, pt);
      calls++;
      if (!res.ok) { console.log(`✗ ${q} @ ${pt.lat},${pt.lng} — HTTP ${res.status}`); if (res.status === 403) { pt.stop = true; break; } continue; }
      for (const p of (await res.json()).places ?? []) {
        const name = p.displayName?.text ?? '';
        const lat = p.location?.latitude, lng = p.location?.longitude;
        if (!lat || !lng) continue;
        if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;
        if (existingPlaceIds.has(p.id) || found.has(p.id)) continue;
        if (!RELEVANT.test(name) || SKIP.test(name)) continue;
        if (nearExisting(lat, lng)) continue;
        found.set(p.id, { name, address: p.formattedAddress ?? '', lat, lng, placeId: p.id, primaryType: p.primaryType ?? '' });
      }
    } catch (e) { console.log(`✗ ${q} @ ${pt.lat},${pt.lng} — ${e.message}`); }
    await sleep(250);
  }
  if (pt.stop) break;
}

const candidates = [...found.values()].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
writeFileSync('scripts/kidfarm-candidates.json', JSON.stringify(candidates, null, 2) + '\n', 'utf8');
console.log(`\nKlaar. Calls: ${calls}. Speelboerderij-kandidaten: ${candidates.length}.`);
console.log('Weggeschreven naar scripts/kidfarm-candidates.json.');
