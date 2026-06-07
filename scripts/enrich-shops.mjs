/* ═══════════════════════════════════════════════════════════════
   enrich-shops.mjs — verrijk winkels met Place Details (New)

   Haalt per winkel (met placeId) op: openingstijden, telefoon, website,
   en bedrijfsstatus (om permanent gesloten zaken te signaleren).

   VEILIG: sleutel uit env (GOOGLE_PLACES_KEY); dry-run tenzij --write;
   --limit N voor een testbatch. Eén call per winkel.

     $env:GOOGLE_PLACES_KEY="JOUW_SLEUTEL"
     node scripts/enrich-shops.mjs --limit 3
     node scripts/enrich-shops.mjs --write
   ═══════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync } from 'fs';

/* ── Openingstijden: Google-periods → ons formaat ("ma-vr 9-17u · za 9-13u") ── */
const ABBR  = { 0:'zo', 1:'ma', 2:'di', 3:'wo', 4:'do', 5:'vr', 6:'za' };
const ORDER = [1, 2, 3, 4, 5, 6, 0]; // ma..zo

function fmtTime(t) {
  const h = t.hour || 0, m = t.minute || 0;
  return m ? `${h}.${String(m).padStart(2, '0')}` : `${h}`;
}

export function periodsToHours(periods) {
  if (!periods || !periods.length) return null;
  // 24/7: één period dat opent op 00:00 zonder close
  if (periods.length === 1 && periods[0].open && !periods[0].close
      && (periods[0].open.hour || 0) === 0 && (periods[0].open.minute || 0) === 0) {
    return '24/7';
  }
  const byDay = {};
  for (const p of periods) {
    if (!p.open || !p.close) continue;
    const d = p.open.day;
    (byDay[d] ||= []).push(`${fmtTime(p.open)}-${fmtTime(p.close)}u`);
  }
  const sig = {};
  for (const d of ORDER) sig[d] = (byDay[d] || []).join('|');

  const segments = [];
  let i = 0;
  while (i < ORDER.length) {
    const d = ORDER[i];
    if (!sig[d]) { i++; continue; }
    let j = i;
    while (j + 1 < ORDER.length && sig[ORDER[j + 1]] === sig[d]) j++;
    const span = i === j ? ABBR[d] : `${ABBR[ORDER[i]]}-${ABBR[ORDER[j]]}`;
    for (const range of byDay[d]) segments.push(`${span} ${range}`);
    i = j + 1;
  }
  return segments.join(' · ') || null;
}

/* Huidige openingstijden "vaag"? (dan mogen we ze vervangen) */
export function isVague(h) {
  if (!h) return true;
  if (/24\s*\/\s*7/.test(h)) return false;
  if (/\d{1,2}([.:,]\d{2})?\s*[-–]\s*\d/.test(h)) return false; // bevat een tijdrange
  return true; // "zie website", "dagelijks", "op afspraak", "bel/mail" …
}

/* ── Hoofdprogramma (alleen als direct uitgevoerd, niet bij import) ── */
const isMain = import.meta.url === `file://${process.argv[1]}` ||
               process.argv[1]?.endsWith('enrich-shops.mjs');

if (isMain) {
  const KEY = process.env.GOOGLE_PLACES_KEY;
  if (!KEY) {
    console.error('Geen sleutel. Zet eerst:  $env:GOOGLE_PLACES_KEY="JOUW_SLEUTEL"');
    process.exit(1);
  }

  const args  = process.argv.slice(2);
  const WRITE = args.includes('--write');
  let LIMIT = Infinity;
  const li = args.indexOf('--limit');
  if (li !== -1 && args[li + 1]) LIMIT = parseInt(args[li + 1], 10);
  /* --since N: alleen winkels met id >= N (zo verrijken we enkel de nieuwe). */
  let SINCE = 0;
  const si = args.indexOf('--since');
  if (si !== -1 && args[si + 1]) SINCE = parseInt(args[si + 1], 10);

  const FILE  = 'src/data/verifiedShops.json';
  const shops = JSON.parse(readFileSync(FILE, 'utf8'));
  const pool  = shops.filter(s => s.placeId && !s.osm && (+s.id || 0) >= SINCE);
  const todo  = pool.slice(0, LIMIT);

  console.log(`Met placeId${SINCE ? ` (id ≥ ${SINCE})` : ''}: ${pool.length}. Verwerken: ${todo.length}` +
              `${WRITE ? '  → OPSLAAN' : '  → dry-run'}\n`);

  let calls = 0, hoursSet = 0, phoneSet = 0, webSet = 0, ratingSet = 0;
  const closed = [];

  for (const shop of todo) {
    try {
      const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(shop.placeId)}?languageCode=nl&regionCode=NL`;
      const res = await fetch(url, {
        headers: {
          'X-Goog-Api-Key':   KEY,
          'X-Goog-FieldMask': 'displayName,regularOpeningHours.periods,nationalPhoneNumber,websiteUri,businessStatus,rating,userRatingCount',
        },
      });
      calls++;
      if (!res.ok) {
        const txt = await res.text();
        console.log(`✗ ${shop.name} — HTTP ${res.status}: ${txt.slice(0, 100)}`);
        if (res.status === 403 || res.status === 429) { console.log('\n⚠ Gestopt (sleutel/limiet).'); break; }
        continue;
      }
      const d = await res.json();

      const newHours = periodsToHours(d.regularOpeningHours?.periods);
      const changes = [];

      if (newHours && isVague(shop.hours)) {
        changes.push(`uren: "${shop.hours ?? '—'}" → "${newHours}"`);
        if (WRITE) shop.hours = newHours;
        hoursSet++;
      }
      if (d.nationalPhoneNumber && !shop.phone) {
        changes.push(`tel: ${d.nationalPhoneNumber}`);
        if (WRITE) shop.phone = d.nationalPhoneNumber;
        phoneSet++;
      }
      if (d.websiteUri && !shop.website) {
        changes.push('website ✓');
        if (WRITE) shop.website = d.websiteUri;
        webSet++;
      }
      if (d.rating != null && shop.googleRating == null) {
        changes.push(`${d.rating}★ (${d.userRatingCount ?? 0})`);
        if (WRITE) { shop.googleRating = d.rating; shop.googleReviews = d.userRatingCount ?? 0; }
        ratingSet++;
      }
      if (d.businessStatus && d.businessStatus !== 'OPERATIONAL') {
        closed.push(`${shop.name} (id ${shop.id}) — ${d.businessStatus}`);
      }

      console.log(`${changes.length ? '✓' : '·'} ${shop.name}${changes.length ? '  [' + changes.join(' | ') + ']' : '  (niets nieuws)'}`);
    } catch (e) {
      console.log(`✗ ${shop.name} — ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nKlaar. Calls: ${calls}. Uren: ${hoursSet}, telefoon: ${phoneSet}, website: ${webSet}, rating: ${ratingSet}.`);
  if (closed.length) {
    console.log(`\n⚠ Mogelijk gesloten (${closed.length}) — handmatig nakijken:`);
    closed.forEach(c => console.log('   ' + c));
  }

  if (WRITE && (hoursSet || phoneSet || webSet || ratingSet)) {
    writeFileSync(FILE, JSON.stringify(shops, null, 2) + '\n', 'utf8');
    console.log(`\nOpgeslagen in ${FILE}.`);
  } else if (!WRITE) {
    console.log('\nDry-run — niets gewijzigd. Voeg --write toe om op te slaan.');
  }
}
