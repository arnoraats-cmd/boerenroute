/* Voeg speelboerderij-kandidaten toe als type 'onderweg' (kindvriendelijk).
   Geen API nodig. Dry-run standaard; --write om op te slaan. */
import { readFileSync, writeFileSync } from 'fs';

const WRITE = process.argv.includes('--write');
const cands = JSON.parse(readFileSync('scripts/kidfarm-candidates.json', 'utf8'));
const shops = JSON.parse(readFileSync('src/data/verifiedShops.json', 'utf8'));

const NOISE = new Set(['lodging', 'campground', 'hotel', 'restaurant']);
/* Alleen échte speel-/kinder-/beleefboerderijen (niet elke gewone hoeve) */
const STRONG = /speelboerderij|belevenis|beleef|kinderboerderij|kinderpret|speelparadijs|natuurspeeltuin|doe-?boerderij|speeltuin/i;
const isNL = a => /\d{4}\s?[A-Z]{2}/.test(a) && !/Belgi/i.test(a);
function cleanAddr(a) {
  let s = a.replace(/,?\s*(Nederland|Netherlands)\s*$/i, '').trim();
  let plaats = '';
  const m = s.match(/\b\d{4}\s?[A-Z]{2}\b\s*(.+)$/);
  if (m) plaats = m[1].trim().replace(/,\s*$/, '');
  s = s.replace(/\b\d{4}\s?[A-Z]{2}\b\s*/, '').replace(/\s*,\s*,/g, ',').replace(/,\s*$/, '').trim();
  if (!plaats) plaats = (s.split(',').pop() || '').trim();
  return { address: s, plaats };
}
const km = (la1, lo1, la2, lo2) => {
  const R = 6371, dLa = (la2-la1)*Math.PI/180, dLo = (lo2-lo1)*Math.PI/180;
  const x = Math.sin(dLa/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
  return R*2*Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
};

let nextId = Math.max(...shops.map(s => s.id)) + 1;
const added = [], placed = [];

for (const c of cands) {
  if (!isNL(c.address) || NOISE.has(c.primaryType) || !STRONG.test(c.name)) continue;
  if (placed.some(p => km(p.lat, p.lng, c.lat, c.lng) < 0.08)) continue;
  const { address, plaats } = cleanAddr(c.address);
  const emoji = /speeltuin|pret|speel/i.test(c.name) ? '🛝' : '🐐';
  added.push({
    id: nextId++, emoji, name: c.name, type: 'onderweg',
    premium: false, seasonal: false,
    lat: +c.lat.toFixed(6), lng: +c.lng.toFixed(6),
    address, hours: null, products: [], tags: ['kindvriendelijk'],
    placeId: c.placeId, googleRating: null, googleReviews: null, dagVers: null,
    desc: `Speelboerderij in ${plaats || 'de buurt'} — een leuk uitje met kinderen: boerderijdieren, spelen en ravotten. Combineer met een boerderijwinkel in de buurt.`,
  });
  placed.push({ lat: c.lat, lng: c.lng });
}

console.log(`Toe te voegen: ${added.length} speelboerderijen (type onderweg, kindvriendelijk).`);
added.slice(0, 8).forEach(s => console.log(`  ${s.emoji} ${s.name} — ${s.address}`));

if (WRITE && added.length) {
  writeFileSync('src/data/verifiedShops.json', JSON.stringify([...shops, ...added], null, 2) + '\n', 'utf8');
  console.log(`\nOpgeslagen: ${shops.length} → ${shops.length + added.length}.`);
} else if (!WRITE) {
  console.log('\nDry-run — niets opgeslagen. Voeg --write toe.');
}
