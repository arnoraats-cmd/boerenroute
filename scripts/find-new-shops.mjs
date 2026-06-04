/* ═══════════════════════════════════════════════════════════════
   find-new-shops.mjs — ontdek nieuwe boerderijwinkels/automaten

   Zoekt via Places API (New) Text Search op een raster over NL met
   Nederlandse zoektermen, ontdubbelt tegen de bestaande database én
   onderling, en schrijft een KANDIDATENLIJST weg (scripts/new-candidates.json).
   Niets wordt automatisch aan verifiedShops.json toegevoegd — eerst checken.

   VEILIG: sleutel uit env (GOOGLE_PLACES_KEY). --limit N beperkt het aantal
   rasterpunten (voor een goedkope testrun).

     $env:GOOGLE_PLACES_KEY="JOUW_SLEUTEL"
     node scripts/find-new-shops.mjs --limit 2     # test (2 punten)
     node scripts/find-new-shops.mjs               # volledige run
   ═══════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync } from 'fs';

const KEY = process.env.GOOGLE_PLACES_KEY;
if (!KEY) { console.error('Geen sleutel. Zet:  $env:GOOGLE_PLACES_KEY="JOUW_SLEUTEL"'); process.exit(1); }

const args = process.argv.slice(2);
let LIMIT = Infinity;
const li = args.indexOf('--limit');
if (li !== -1 && args[li + 1]) LIMIT = parseInt(args[li + 1], 10);

/* Zoektermen die de naamgeving van deze zaken goed vangen */
const QUERIES = [
  'boerderijwinkel', 'eierautomaat', 'melktap', 'zelfpluk', 'hoevewinkel',
  'streekproducten boerderij', 'kaasboerderij', 'vleesautomaat',
  'zuivelautomaat', 'aardappelautomaat',
];

/* Fijn raster over (bewoond) Nederland — kleinere cellen voor dichte gebieden */
const GRID = [];
for (let lat = 50.75; lat <= 53.5; lat += 0.35)
  for (let lng = 3.4; lng <= 7.1; lng += 0.4)
    GRID.push({ lat: +lat.toFixed(3), lng: +lng.toFixed(3) });
const points = GRID.slice(0, LIMIT);

/* Relevantie: naam moet plausibel boeren-/streek-gerelateerd zijn (ruwe ruisfilter) */
const RELEVANT = /boerderij|boeren|hoeve|hoev|eier|melk|zuivel|kaas|zelfpluk|pluk|streek|automaat|fruit|asperge|akker|landwinkel|erf|tuinderij|imker|honing/i;

const existing = JSON.parse(readFileSync('src/data/verifiedShops.json', 'utf8'));
const existingPlaceIds = new Set(existing.filter(s => s.placeId).map(s => s.placeId));

function km(a, blat, blng) {
  const R = 6371, dLa = (blat - a.lat) * Math.PI / 180, dLo = (blng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(blat * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
const nearExisting = (lat, lng) => existing.some(s => km({ lat: s.lat, lng: s.lng }, lat, lng) < 0.15);

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* Zoek met automatische herhaling bij tijdelijke fouten (500/503/429) */
async function searchText(q, pt) {
  const body = JSON.stringify({
    textQuery: q, languageCode: 'nl', regionCode: 'NL', maxResultCount: 20,
    locationBias: { circle: { center: { latitude: pt.lat, longitude: pt.lng }, radius: 26000 } },
  });
  const headers = {
    'Content-Type':     'application/json',
    'X-Goog-Api-Key':   KEY,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.businessStatus',
  };
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', { method: 'POST', headers, body });
    if (res.ok) return res;
    if (res.status === 403) return res;                 // sleutel-/rechtenprobleem → niet herhalen
    if ((res.status >= 500 || res.status === 429) && attempt < 4) {
      await sleep(1000 * attempt);                       // 1s, 2s, 3s wachten en opnieuw
      continue;
    }
    return res;
  }
}

const found = new Map(); // placeId → kandidaat
let calls = 0;

console.log(`Raster: ${points.length} punten × ${QUERIES.length} zoektermen = max ${points.length * QUERIES.length} calls\n`);

for (const pt of points) {
  for (const q of QUERIES) {
    try {
      const res = await searchText(q, pt);
      calls++;
      if (!res.ok) {
        const t = await res.text();
        console.log(`✗ ${q} @ ${pt.lat},${pt.lng} — HTTP ${res.status}: ${t.slice(0, 90)}`);
        if (res.status === 403) { console.log('\n⚠ Gestopt (sleutelprobleem).'); pt.stop = true; break; }
        continue; // 5xx/429 na alle pogingen: deze overslaan, doorgaan
      }
      for (const p of (await res.json()).places ?? []) {
        const name = p.displayName?.text ?? '';
        const lat = p.location?.latitude, lng = p.location?.longitude;
        if (!lat || !lng) continue;
        if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;
        if (existingPlaceIds.has(p.id)) continue;       // al in database (placeId)
        if (found.has(p.id)) continue;                  // al gevonden
        if (!RELEVANT.test(name)) continue;             // ruisfilter op naam
        if (nearExisting(lat, lng)) continue;           // staat al (binnen 150m)
        found.set(p.id, {
          name, address: p.formattedAddress ?? '', lat, lng,
          placeId: p.id, primaryType: p.primaryType ?? '',
        });
      }
    } catch (e) {
      console.log(`✗ ${q} @ ${pt.lat},${pt.lng} — ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 250));
  }
  if (pt.stop) break;
}

const candidates = [...found.values()].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
writeFileSync('scripts/new-candidates.json', JSON.stringify(candidates, null, 2) + '\n', 'utf8');

console.log(`\nKlaar. API-calls: ${calls}. Nieuwe kandidaten (na ontdubbelen + filter): ${candidates.length}.`);
console.log('Weggeschreven naar scripts/new-candidates.json — nog NIET aan de database toegevoegd.');
