/* ═══════════════════════════════════════════════════════════════
   fetch-ratings.mjs — Google-ratings ophalen voor winkels zonder rating

   VEILIG GEBRUIK:
   - De API-sleutel komt UIT een omgevingsvariabele (GOOGLE_PLACES_KEY),
     staat dus nooit in deze code, in de repo of op de live site.
   - Standaard is dit een DRY-RUN: het toont alleen wat het zou vinden,
     en schrijft NIETS weg. Pas met --write wordt het opgeslagen.
   - Gebruik altijd eerst een kleine testbatch: --limit 3

   Voorbeelden (PowerShell):
     $env:GOOGLE_PLACES_KEY="JOUW_SLEUTEL"
     node scripts/fetch-ratings.mjs --limit 3          # test, dry-run
     node scripts/fetch-ratings.mjs --limit 3 --write  # test, opslaan
     node scripts/fetch-ratings.mjs --write            # alle resterende
   ═══════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync } from 'fs';

const KEY = process.env.GOOGLE_PLACES_KEY;
if (!KEY) {
  console.error('Geen sleutel gevonden. Zet eerst:  $env:GOOGLE_PLACES_KEY="JOUW_SLEUTEL"');
  process.exit(1);
}

const args  = process.argv.slice(2);
const WRITE = args.includes('--write');
let LIMIT = Infinity;
const li = args.indexOf('--limit');
if (li !== -1 && args[li + 1]) LIMIT = parseInt(args[li + 1], 10);

const FILE  = 'src/data/verifiedShops.json';
const shops = JSON.parse(readFileSync(FILE, 'utf8'));

/* Alleen handmatige winkels zonder rating (geen OSM-winkels) */
const zonder = shops.filter(s => s.googleRating == null && !s.osm);
const todo   = zonder.slice(0, LIMIT);

console.log(`Zonder rating: ${zonder.length}. Nu verwerken: ${todo.length}` +
            `${WRITE ? '  → OPSLAAN' : '  → dry-run (niets opslaan)'}\n`);

let calls = 0, matches = 0;

for (const shop of todo) {
  const textQuery = `${shop.name} ${shop.address}`;
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'X-Goog-Api-Key':   KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount',
      },
      body: JSON.stringify({ textQuery, languageCode: 'nl', regionCode: 'NL', maxResultCount: 1 }),
    });
    calls++;

    if (!res.ok) {
      const txt = await res.text();
      console.log(`✗ ${shop.name} — HTTP ${res.status}: ${txt.slice(0, 120)}`);
      if (res.status === 403 || res.status === 429) {
        console.log('\n⚠ Gestopt: sleutel/limiet-probleem. Controleer de API-key en quota.');
        break;
      }
      continue;
    }

    const p = (await res.json()).places?.[0];
    if (!p) { console.log(`– ${shop.name} — geen match gevonden`); continue; }

    const rating  = p.rating ?? null;
    const reviews = p.userRatingCount ?? 0;
    console.log(`✓ ${shop.name}`);
    console.log(`    gevonden: ${p.displayName?.text ?? '?'} · ${p.formattedAddress ?? '?'}`);
    console.log(`    rating:   ${rating ?? '—'}★  (${reviews})  placeId=${p.id}`);

    if (rating != null) {
      matches++;
      if (WRITE) {
        shop.googleRating  = rating;
        shop.googleReviews = reviews;
        if (!shop.placeId) shop.placeId = p.id;
      }
    }
  } catch (e) {
    console.log(`✗ ${shop.name} — ${e.message}`);
  }

  await new Promise(r => setTimeout(r, 300)); // beleefde pauze tussen calls
}

console.log(`\nKlaar. API-calls: ${calls}. Gevonden met rating: ${matches}.`);

if (WRITE && matches > 0) {
  writeFileSync(FILE, JSON.stringify(shops, null, 2) + '\n', 'utf8');
  console.log(`Opgeslagen in ${FILE}.`);
} else if (!WRITE) {
  console.log('Dry-run — er is niets gewijzigd. Voeg --write toe om op te slaan.');
}
