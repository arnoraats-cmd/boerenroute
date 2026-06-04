/* geocode-pdok.mjs — Geocodeer kandidaat-adressen via PDOK Locatieserver
   (officiële NL geocoder, gratis, geen API-key, geen kostenrisico)

   De bron-CSV heeft geplakte regels: "NaamStraat 12, 1234 AB Plaats, Nederland"
   We extraheren postcode + huisnummer (in NL samen genoeg voor exacte locatie).

   Usage: node scripts/geocode-pdok.mjs candidates_automaten.csv [--all]
*/
import fs from 'fs';

const csvFile = process.argv[2];
const doAll = process.argv.includes('--all');
if (!csvFile) {
  console.error('Gebruik: node scripts/geocode-pdok.mjs <csv> [--all]');
  process.exit(1);
}

const lines = fs.readFileSync(csvFile, 'utf8').split('\n').slice(1).filter(l => l.trim());
const rawAddrs = lines.map(l => l.trim().replace(/^"|"$/g, ''));

// Parse: naam, postcode, huisnummer, plaats uit de geplakte string
function parse(raw) {
  // Postcode NNNN AA (spatie optioneel)
  const pc = raw.match(/(\d{4})\s*([A-Z]{2})\b/);
  // Eerste deel vóór eerste komma = naam + straat + huisnr
  const firstPart = raw.split(',')[0];
  // Huisnummer: laatste getal (evt. met letter/toevoeging) in dat deel
  const hn = firstPart.match(/(\d+)\s*([A-Za-z])?\b\s*$/);
  // Plaats: tekst na de postcode, tot komma
  let city = null;
  if (pc) {
    const afterPc = raw.slice(raw.indexOf(pc[0]) + pc[0].length);
    city = afterPc.split(',')[0].trim();
  }
  return {
    postcode: pc ? `${pc[1]}${pc[2]}` : null,
    huisnummer: hn ? hn[1] : null,
    toevoeging: hn && hn[2] ? hn[2] : '',
    city,
  };
}

async function geocode(raw) {
  const p = parse(raw);
  if (!p.postcode || !p.huisnummer) {
    return { raw, lat: null, lng: null, error: 'geen postcode/huisnr' };
  }
  // PDOK vrije zoekopdracht: postcode + huisnummer is uniek in NL
  const q = `${p.postcode} ${p.huisnummer}${p.toevoeging}`;
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(q)}&fq=type:adres&rows=1`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Boerenroute.nl' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const doc = data.response?.docs?.[0];
    if (!doc || !doc.centroide_ll) {
      return { raw, ...p, lat: null, lng: null, error: 'niet gevonden' };
    }
    // centroide_ll = "POINT(5.123 51.456)" → lng lat
    const m = doc.centroide_ll.match(/POINT\(([\d.]+) ([\d.]+)\)/);
    const lng = parseFloat(m[1]), lat = parseFloat(m[2]);
    return { raw, ...p, lat, lng, weergave: doc.weergavenaam, error: null };
  } catch (e) {
    return { raw, ...p, lat: null, lng: null, error: e.message };
  }
}

async function run() {
  const batch = doAll ? rawAddrs : rawAddrs.slice(0, 5);
  console.log(`🌍 PDOK geocoding — ${batch.length}/${rawAddrs.length} adressen${doAll ? ' (ALLES)' : ' (TEST)'}\n`);

  const results = [];
  let ok = 0, fail = 0;
  for (const raw of batch) {
    const r = await geocode(raw);
    results.push(r);
    if (r.lat) { ok++; console.log(`✓ ${r.lat.toFixed(4)},${r.lng.toFixed(4)}  ${r.weergave || raw.slice(0, 50)}`); }
    else { fail++; console.log(`✗ [${r.error}] ${raw.slice(0, 60)}`); }
    await new Promise(r => setTimeout(r, 120)); // PDOK is soepel, kleine pauze
  }

  const outFile = csvFile.replace('.csv', '.pdok.json');
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2) + '\n', 'utf8');
  console.log(`\n✓ Gevonden: ${ok}   ✗ Niet: ${fail}   📄 ${outFile}`);
  if (!doAll) console.log(`\n→ Tevreden? Draai opnieuw met --all voor alle ${rawAddrs.length}.`);
}

run();
