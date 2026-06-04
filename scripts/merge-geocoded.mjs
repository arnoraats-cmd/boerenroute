/* merge-geocoded.mjs — Voeg gegeocodeerde kandidaten toe aan verifiedShops.json
   - Schone naam (straat + huisnr eraf), mojibake gerepareerd
   - Net adres "Straat 12, Plaats" uit PDOK
   - Ontdubbelt op coördinaat-nabijheid (~80m) tegen bestaande shops
   Usage: node scripts/merge-geocoded.mjs [--write]
*/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const write = process.argv.includes('--write');

const shopFile = path.join(root, 'src/data/verifiedShops.json');
const geoFile = path.join(root, 'scripts/new-shops-geocoded.json');

const shops = JSON.parse(fs.readFileSync(shopFile, 'utf8'));
const geo = JSON.parse(fs.readFileSync(geoFile, 'utf8'));
let nextId = Math.max(...shops.map(s => s.id || 0)) + 1;

// --- Mojibake-reparatie (UTF-8 verkeerd gelezen) ---
function fixText(s) {
  return s
    .replace(/Ã«/g, 'ë').replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è').replace(/Ã¯/g, 'ï')
    .replace(/Ã¶/g, 'ö').replace(/Ã¼/g, 'ü').replace(/Ã´/g, 'ô').replace(/Ã /g, 'à')
    .replace(/Ã£/g, 'ã').replace(/Ã§/g, 'ç').replace(/Ã±/g, 'ñ').replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó').replace(/Ã¡/g, 'á').replace(/Ãª/g, 'ê').replace(/Ã /g, 'à')
    .replace(/Â´/g, '’').replace(/Â/g, '')
    .replace(/â‚¬/g, '€').replace(/â€™|â€˜/g, '’')
    .replace(/â/g, '’')  // resterende â = apostrof ('t, 's)
    .replace(/\s+/g, ' ').trim();
}

// Naam = deel vóór straat+huisnr
function cleanName(addr, straat) {
  const firstPart = addr.split(',')[0];
  let name = firstPart;
  if (straat) {
    let idx = firstPart.toLowerCase().lastIndexOf(straat.toLowerCase());
    // val terug op eerste straatwoord als de volledige straat niet 1-op-1 matcht
    if (idx <= 0) {
      const firstWord = straat.split(' ')[0];
      if (firstWord.length >= 4) idx = firstPart.toLowerCase().lastIndexOf(firstWord.toLowerCase());
    }
    if (idx > 0) name = firstPart.slice(0, idx);
  }
  // fallback: knip trailing "<woord> <nummer>"
  if (name === firstPart) name = firstPart.replace(/[A-Z][a-zà-ÿ]+\s*\d+\s*[A-Za-z]?\s*$/, '');
  name = fixText(name);
  return name || fixText(firstPart);
}

function bepaalType(s) {
  if (/automa(at|ten)|melktap|eierautoma|drive-?in|drive\b/i.test(s)) return 'automaat';
  if (/zelfpluk|pluktuin|plukroute|zelf.?oogst/i.test(s)) return 'zelfpluk';
  if (/\bmarkt|streekmarkt/i.test(s)) return 'markt';
  return 'winkel';
}
function bepaalEmoji(s) {
  if (/kaas|zuivel|melk/i.test(s)) return '🧀';
  if (/eier|kip|pluimvee|legkippen/i.test(s)) return '🥚';
  if (/aardbei|fruit|kersen|appel|peren|boomgaard|bes/i.test(s)) return '🍓';
  if (/asperge|groente|tuinderij|pompoen|aardappel/i.test(s)) return '🥕';
  if (/vlees|rund|angus|wagyu|varken|lams/i.test(s)) return '🥩';
  return '🌾';
}
function bepaalTags(s) {
  const t = [];
  if (/kaas|zuivel|melk/i.test(s)) t.push('zuivel');
  if (/eier|kip|pluimvee/i.test(s)) t.push('eieren');
  if (/aardbei|fruit|kersen|appel|peren|boomgaard|bes/i.test(s)) t.push('fruit');
  if (/asperge|groente|tuinderij|pompoen|aardappel/i.test(s)) t.push('groente');
  if (/vlees|rund|angus|wagyu|varken|lams/i.test(s)) t.push('vlees');
  if (!t.length) t.push('groente');
  return t;
}

// Haversine in meters
function dist(a, b, c, d) {
  const R = 6371000, toR = x => x * Math.PI / 180;
  const dLat = toR(c - a), dLng = toR(d - b);
  const h = Math.sin(dLat/2)**2 + Math.cos(toR(a))*Math.cos(toR(c))*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const existingCoords = shops.filter(s => s.lat && s.lng).map(s => [s.lat, s.lng]);
let added = 0, dupCoord = 0;
const newShops = [];

for (const g of geo) {
  // Coördinaat-dedup (~80m)
  const isDup = existingCoords.some(([la, ln]) => dist(la, ln, g.lat, g.lng) < 80);
  if (isDup) { dupCoord++; continue; }

  const name = cleanName(g.addr, g.straat);
  const niceAddr = `${g.straat || ''} ${(g.weergave.match(/\b(\d+\w*)\b/) || [])[1] || ''}, ${g.plaats}`.replace(/\s+/g, ' ').trim();

  const shop = {
    id: nextId++,
    emoji: bepaalEmoji(name),
    name,
    type: bepaalType(name),
    premium: false,
    seasonal: false,
    lat: g.lat,
    lng: g.lng,
    address: niceAddr,
    hours: null,
    products: [],
    tags: bepaalTags(name),
    placeId: null,
    googleRating: null,
    googleReviews: null,
    dagVers: null,
    desc: null,
    osm: false,
  };
  newShops.push(shop);
  existingCoords.push([g.lat, g.lng]); // ook binnen-batch dedup
  added++;
}

console.log(`📦 Bestaand: ${shops.length}`);
console.log(`⊘ Duplicaat op coördinaat (~80m): ${dupCoord}`);
console.log(`✅ Nieuw toe te voegen: ${added}\n`);
console.log('Voorbeeld eerste 8:');
newShops.slice(0, 8).forEach(s => console.log(`  ${s.emoji} ${s.name}  —  ${s.address}  [${s.type}, ${s.tags.join('/')}]`));

if (write) {
  shops.push(...newShops);
  fs.writeFileSync(shopFile, JSON.stringify(shops, null, 2) + '\n', 'utf8');
  console.log(`\n💾 Geschreven. Database nu: ${shops.length} locaties.`);
} else {
  console.log(`\n→ Dit was een DROOGTEST. Voeg --write toe om op te slaan.`);
}
