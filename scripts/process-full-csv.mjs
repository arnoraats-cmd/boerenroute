/* process-full-csv.mjs — Volledige verwerking van de bron-CSV
   1. Lees "Naamloze spreadsheet - Blad1.csv" (geplakte naam+adres regels)
   2. Splits naam van straat (heuristiek), parse postcode/huisnr/plaats
   3. Filter ongewenste types (slagerij, bakkerij, restaurant, wijn, vis, etc.)
   4. Ontdubbel tegen verifiedShops.json én binnen het bestand
   5. Geocodeer via PDOK (postcode+huisnr → exacte NL-coördinaten)
   6. Schrijf kandidaten naar scripts/kidfarm-candidates... nee → new-shops.json

   Usage: node scripts/process-full-csv.mjs [--all]
*/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const doAll = process.argv.includes('--all');

const srcFile = path.join(root, 'boerenroute_slim_ontdubbeld.csv');
const shopFile = path.join(root, 'src/data/verifiedShops.json');

const shops = JSON.parse(fs.readFileSync(shopFile, 'utf8'));
const existingAddrs = new Set(shops.map(s => (s.address || '').toLowerCase().replace(/\s+/g, ' ').trim()));

// --- ONGEWENST: types die we niet willen (gebruiker: geen slagerij e.d.) ---
const EXCLUDE = [
  /slagerij|keurslager|vleeswinkel|gildeslager|poelier/i,
  /\bbakker|banket|bakkerij|broodjes|meesterbakker|warme\s*bakker|worstenbrood/i,
  /restaurant|lunchroom|bistro|snackbar|pizzeria|theetuin|tearoom|gastrobar|eethuis|koffie|wedding/i,
  /wijngaard|wijnhuis|wijnhandel|wijnkop|wijndomein|wijngoed|brouwerij|stokerij|bierbrouw|likeur|jenever|destil/i,
  /vishandel|viswinkel|palingrok|palingkwek|visspecialist|vis-van|vishandel|visserij|oesterzwam(?!.*kwekerij)/i,
  /trimsalon|kapper|cosmetica|zeep(?!.*boer)/i,
  /\bhotel\b|camping(?!.*boer)|bed\s*&|pension|herberg/i,
  /chocola|bonbon|snoep|praline|siroopwafel|stroopwafel|ijssalon|ijscafe|gelato|softijs(?!.*boer)/i,
  /museum|molenmuseum|bakkerijmuseum|pluimveemuseum|arboretum|\bmolen\b|korenmolen/i,
  /tuincentrum|plantenkwekerij|bloemenkwek|bloembind|snijbloem|tuinplanten/i,
  /dagbesteding|dagopvang|zorgboerderij|kinderboerderij|kijkboerderij|beleefboerderij|activiteitenboerderij|knuffel/i,
  /imkerij|imker\b|honinghuis|bijenhoud|bijenver|stadsimker|bijenhuis/i,
  /natuurvoeding|gezondheidswinkel|biowinkel(?!.*boer)|ekoplaza|natuurwinkel|reformhuis/i,
];

// --- GEWENST: kernwoorden die het wél een boerenstop maken ---
const INCLUDE = [
  /boerderij|boerderijwinkel|boeren|hoeve\b|farm\b|landwinkel|streekwinkel|streekproduct|plattelandswinkel/i,
  /automaat|melktap|melkdrive|eierautomaat|eier|versautomaat/i,
  /zelfpluk|pluktuin|plukroute|pluk\b|oogst|zelf.?oogst/i,
  /kaasboerd|kaasmak|zuivelboerd|boerenzuivel|boerenkaas/i,
  /fruitbedrijf|fruitteelt|fruitkwek|boomgaard|kersen|aardbei|blauwe\s*bes|zachtfruit|appel|peren/i,
  /aspergeb|aspergek|asperge|groenteboerd|tuinderij|pompoen/i,
  /vleesboerd|weidevlees|rundvlees|scharrelvlees|hoeve/i,
  // --- GROEP A: extra boeren-trefwoorden (door gebruiker goedgekeurd) ---
  /melkvee|zuivel|scharrelmelk|geitenbedrijf|geitenhouderij|melkboer/i,
  /pluimvee|legkippen|kippen|stipkip|kipsalon|boerder.?ei/i,
  /groente|fruit|tomat|courgette|rabarber|aubergine|augurk|champignon|piepers|erpelhokske|stalletje|muismeloen/i,
  /scharrelvarken|wagyu|berkshire|landbouw/i,
  /\bboer\b|boer\s|farmshop|streekgoed|van hier|honing/i,
];

// Type-bepaling voor het datamodel
function bepaalType(s) {
  if (/automaat|melktap|eierautomaat|drive-?in|drive\b/i.test(s)) return 'automaat';
  if (/zelfpluk|pluktuin|plukroute|zelf.?oogst/i.test(s)) return 'zelfpluk';
  if (/markt|streekmarkt/i.test(s)) return 'markt';
  return 'winkel';
}
function bepaalEmoji(s) {
  if (/kaas|zuivel|melk/i.test(s)) return '🧀';
  if (/eier|kip|pluimvee|legkippen/i.test(s)) return '🥚';
  if (/aardbei|fruit|kersen|appel|peren|boomgaard/i.test(s)) return '🍓';
  if (/asperge|groente|tuinderij|pompoen/i.test(s)) return '🥕';
  if (/vlees|rund|angus|wagyu|varken|lams/i.test(s)) return '🥩';
  if (/honing/i.test(s)) return '🍯';
  return '🌾';
}
function bepaalTags(s) {
  const t = [];
  if (/kaas|zuivel|melk/i.test(s)) t.push('zuivel');
  if (/eier|kip|pluimvee/i.test(s)) t.push('eieren');
  if (/aardbei|fruit|kersen|appel|peren|boomgaard|bes/i.test(s)) t.push('fruit');
  if (/asperge|groente|tuinderij|pompoen|aardappel/i.test(s)) t.push('groente');
  if (/vlees|rund|angus|wagyu|varken|lams/i.test(s)) t.push('vlees');
  if (/honing/i.test(s)) t.push('honing');
  return t.length ? t : ['streekproducten'];
}

function parse(raw) {
  const pc = raw.match(/(\d{4})\s*([A-Z]{2})\b/);
  const firstPart = raw.split(',')[0];
  const hn = firstPart.match(/(\d+)\s*([A-Za-z])?\s*$/);
  let city = null;
  if (pc) city = raw.slice(raw.indexOf(pc[0]) + pc[0].length).split(',')[0].trim();
  // Naam = firstPart minus straat+huisnr. Straat is geplakt; we pakken de naam
  // als alles vóór het laatste hoofdletterwoord-blok... te onbetrouwbaar.
  // We bewaren de hele firstPart als "naam+straat" en laten naam = firstPart.
  return {
    postcode: pc ? `${pc[1]}${pc[2]}` : null,
    huisnummer: hn ? hn[1] : null,
    toevoeging: hn && hn[2] ? hn[2] : '',
    city,
  };
}

async function pdok(postcode, huisnummer, toevoeging) {
  const q = `${postcode} ${huisnummer}${toevoeging}`;
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(q)}&fq=type:adres&rows=1`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Boerenroute.nl' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const doc = data.response?.docs?.[0];
  if (!doc || !doc.centroide_ll) return null;
  const m = doc.centroide_ll.match(/POINT\(([\d.]+) ([\d.]+)\)/);
  return { lat: parseFloat(m[2]), lng: parseFloat(m[1]), weergave: doc.weergavenaam, straat: doc.straatnaam, plaats: doc.woonplaatsnaam };
}

async function run() {
  const raw = fs.readFileSync(srcFile, 'utf8');
  const allLines = raw.split('\n').map(l => l.trim()).filter(l => l && l !== '"adres"');

  // Dedup binnen bestand + tegen db, filter types
  const seen = new Set();
  const candidates = [];
  let skipExisting = 0, skipExclude = 0, skipNoInclude = 0, skipNoCoordsParse = 0, skipDupInFile = 0;

  for (let line of allLines) {
    const addr = line.replace(/^"|"$/g, '').trim();
    if (!addr || /^\{/.test(addr) || /\{.*\}/.test(addr)) { skipNoCoordsParse++; continue; } // skip {lat,lng}-only regels
    const key = addr.toLowerCase().replace(/\s+/g, ' ').trim();

    if (existingAddrs.has(key)) { skipExisting++; continue; }
    if (seen.has(key)) { skipDupInFile++; continue; }

    if (EXCLUDE.some(r => r.test(addr))) { skipExclude++; continue; }
    if (!INCLUDE.some(r => r.test(addr))) { skipNoInclude++; continue; }

    const p = parse(addr);
    if (!p.postcode || !p.huisnummer) { skipNoCoordsParse++; continue; }

    seen.add(key);
    candidates.push({ addr, ...p });
  }

  console.log(`📊 BRON: ${allLines.length} regels`);
  console.log(`   ⊘ al in db: ${skipExisting}`);
  console.log(`   ⊘ dubbel in bestand: ${skipDupInFile}`);
  console.log(`   ⊘ uitgesloten type: ${skipExclude}`);
  console.log(`   ⊘ geen boeren-trefwoord: ${skipNoInclude}`);
  console.log(`   ⊘ geen postcode/huisnr: ${skipNoCoordsParse}`);
  console.log(`   ✅ kandidaten: ${candidates.length}\n`);

  const batch = doAll ? candidates : candidates.slice(0, 10);
  console.log(`🌍 PDOK geocoding ${batch.length}/${candidates.length}${doAll ? '' : ' (TEST — gebruik --all voor alles)'}\n`);

  const out = [];
  let ok = 0, fail = 0;
  for (const c of batch) {
    try {
      const g = await pdok(c.postcode, c.huisnummer, c.toevoeging);
      if (g) {
        ok++;
        out.push({ addr: c.addr, lat: g.lat, lng: g.lng, straat: g.straat, plaats: g.plaats, weergave: g.weergave });
        if (!doAll) console.log(`✓ ${g.weergave}`);
      } else { fail++; if (!doAll) console.log(`✗ niet gevonden: ${c.addr.slice(0,50)}`); }
    } catch (e) { fail++; if (!doAll) console.log(`✗ ${e.message}: ${c.addr.slice(0,40)}`); }
    await new Promise(r => setTimeout(r, 120));
    if (doAll && (ok + fail) % 50 === 0) console.log(`   ... ${ok + fail}/${batch.length} (${ok} ok)`);
  }

  const outFile = path.join(root, 'scripts/new-shops-geocoded.json');
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`\n✓ Gegeocodeerd: ${ok}   ✗ Niet: ${fail}`);
  console.log(`📄 ${outFile}`);
  if (!doAll) console.log(`\n→ Goed? Draai: node scripts/process-full-csv.mjs --all`);
}

run();
