/* ═══════════════════════════════════════════════════════════════
   build-candidates.mjs — kandidaten → winkel-objecten in verifiedShops.json

   Geen API nodig: zet scripts/new-candidates.json om naar nette winkels
   (type/emoji/producten/tags/desc afgeleid uit naam), schoont het adres op,
   ontdubbelt en voegt toe. Ratings/uren/telefoon/website komen later via
   enrich-shops.mjs + fetch-ratings.mjs.

   Dry-run standaard; --write om op te slaan.
   ═══════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync } from 'fs';

const WRITE = process.argv.includes('--write');
const INCLUSIVE = process.argv.includes('--inclusive'); // gecurateerde lijst: ook generieke namen meenemen
const cands = JSON.parse(readFileSync('scripts/new-candidates.json', 'utf8'));
const shops = JSON.parse(readFileSync('src/data/verifiedShops.json', 'utf8'));

/* Filters: NL-adres, geen ruis-types, geen duidelijke niet-food */
const NOISE = new Set(['supermarket', 'wholesaler', 'florist', 'garden', 'grocery_store', 'market', 'campground', 'lodging']);
const NONFOOD = /\b(zeep|soap|camping|camper|kampeer|manege|stable|stables|brouwerij|brewery|distiller|spiritus|cider)\b/i;
const isNL = a => /\d{4}\s?[A-Z]{2}/.test(a) && !/Belgi/i.test(a);

/* Categorie uit naam (specifiek vóór algemeen) */
function categorize(n) {
  if (/eierautomaat|eier.*automaat/i.test(n)) return 'eierautomaat';
  if (/melktap|melk.*automaat/i.test(n))      return 'melktap';
  if (/zelfpluk|pluktuin/i.test(n))           return 'zelfpluk';
  if (/automaat/i.test(n))                    return 'automaat';
  if (/kaasboerderij|kaasmakerij|zuivelboerderij/i.test(n)) return 'kaasboerderij';
  if (/boerderijwinkel|boeren ?winkel|landwinkel|hoevewinkel|boerderij ?winkel/i.test(n)) return 'boerderijwinkel';
  if (/imker|honing/i.test(n))                return 'imker';
  if (/fruit|aardbei|asperge|boomgaard/i.test(n)) return 'fruitgroente';
  return null; // valt buiten "breed food"
}

/* Schoon adres: "Straat 1, 1234 AB Plaats, Nederland" → "Straat 1, Plaats" + plaatsnaam */
function cleanAddr(a) {
  let s = a.replace(/,?\s*(Nederland|Netherlands)\s*$/i, '').trim();
  let plaats = '';
  const m = s.match(/\b\d{4}\s?[A-Z]{2}\b\s*(.+)$/);
  if (m) plaats = m[1].trim().replace(/,\s*$/, '');
  s = s.replace(/\b\d{4}\s?[A-Z]{2}\b\s*/, '').replace(/\s*,\s*,/g, ',').replace(/,\s*$/, '').trim();
  if (!plaats) plaats = (s.split(',').pop() || '').trim();
  return { address: s, plaats };
}

/* Veld-afleiding per categorie. nm = naam (voor sub-detectie) */
function derive(cat, nm, plaats) {
  const has = re => re.test(nm);
  switch (cat) {
    case 'eierautomaat': return { emoji:'🥚', type:'automaat', products:['verse eieren'], tags:['eieren'], seasonal:false, desc:`Eierautomaat in ${plaats} met verse eieren, vaak dag en nacht bereikbaar.` };
    case 'melktap':      return { emoji:'🥛', type:'automaat', products:['verse melk','zuivel'], tags:['zuivel'], seasonal:false, desc:`Melktap in ${plaats} met verse melk rechtstreeks van de boer.` };
    case 'kaasboerderij':return { emoji:'🧀', type:'winkel', products:['kaas','zuivel'], tags:['zuivel'], seasonal:false, desc:`Kaasboerderij in ${plaats} met eigen kaas en zuivel.` };
    case 'boerderijwinkel':
      if (has(/kaas/i))    return { emoji:'🧀', type:'winkel', products:['kaas','zuivel','streekproducten'], tags:['zuivel'], seasonal:false, desc:`Boerderijwinkel in ${plaats} met kaas en streekproducten.` };
      if (has(/vlees/i))   return { emoji:'🥩', type:'winkel', products:['vlees','streekproducten'], tags:['vlees'], seasonal:false, desc:`Boerderijwinkel in ${plaats} met eigen vlees en streekproducten.` };
      if (has(/groente|tuin/i)) return { emoji:'🥬', type:'winkel', products:['groente','fruit','streekproducten'], tags:['groente'], seasonal:false, desc:`Boerderijwinkel in ${plaats} met verse groente en streekproducten.` };
      return { emoji:'🌱', type:'winkel', products:['streekproducten'], tags:[], seasonal:false, desc:`Boerderijwinkel in ${plaats} met verse streekproducten van het land.` };
    case 'zelfpluk':
      if (has(/bloem/i)) return { emoji:'🌷', type:'zelfpluk', products:['bloemen','zelfpluk'], tags:['kindvriendelijk'], seasonal:true, desc:`Zelfpluk-bloementuin in ${plaats}. Pluk je eigen boeket in het seizoen.` };
      return { emoji:'🍓', type:'zelfpluk', products:['zelfpluk','fruit','groente'], tags:['fruit','kindvriendelijk'], seasonal:true, desc:`Zelfpluktuin in ${plaats}. Pluk in het seizoen je eigen verse oogst.` };
    case 'fruitgroente':
      if (has(/aardbei/i)) return { emoji:'🍓', type:'winkel', products:['aardbeien','fruit'], tags:['fruit'], seasonal:true, desc:`Aardbeien en seizoensfruit in ${plaats}, rechtstreeks van de teler.` };
      if (has(/asperge/i)) return { emoji:'🌱', type:'winkel', products:['asperges','groente'], tags:['groente'], seasonal:true, desc:`Asperges en seizoensgroente in ${plaats}, vers van het land.` };
      return { emoji:'🍎', type:'winkel', products:['fruit','groente'], tags:['fruit','groente'], seasonal:false, desc:`Verse groente en fruit in ${plaats}, rechtstreeks van de teler.` };
    case 'imker':        return { emoji:'🍯', type:'winkel', products:['honing'], tags:['honing'], seasonal:false, desc:`Imker in ${plaats} met streekhoning en bijenproducten.` };
    case 'algemeen':
      if (has(/slagerij|vlees|rund|lam|varken|kalf|beef|meat/i)) return { emoji:'🥩', type:'winkel', products:['vlees','streekproducten'], tags:['vlees'], seasonal:false, desc:`Boerderijslagerij/streekwinkel in ${plaats} met eigen vlees.` };
      if (has(/eier|eitje|pluimvee|\bei\b|\beieren\b/i))         return { emoji:'🥚', type:'winkel', products:['eieren'], tags:['eieren'], seasonal:false, desc:`Verkooppunt in ${plaats} met verse eieren en streekproducten.` };
      if (has(/melk|zuivel/i))                                    return { emoji:'🥛', type:'winkel', products:['zuivel','melk'], tags:['zuivel'], seasonal:false, desc:`Zuivelboerderij/streekwinkel in ${plaats}.` };
      if (has(/ijs|softijs/i))                                    return { emoji:'🍦', type:'winkel', products:['boerderijijs'], tags:['kindvriendelijk'], seasonal:true, desc:`Boerderij-ijs in ${plaats}, vers van eigen koeien.` };
      if (has(/fruit|appel|peer|bes|aardbei|boomgaard|pluk/i))    return { emoji:'🍎', type:'winkel', products:['fruit'], tags:['fruit'], seasonal:false, desc:`Fruit en streekproducten in ${plaats}.` };
      if (has(/groente|tuinderij|tuin|akker|oogst/i))             return { emoji:'🥬', type:'winkel', products:['groente','streekproducten'], tags:['groente'], seasonal:false, desc:`Verse groente en streekproducten in ${plaats}.` };
      if (has(/honing|imker/i))                                   return { emoji:'🍯', type:'winkel', products:['honing'], tags:['honing'], seasonal:false, desc:`Imker/streekwinkel in ${plaats} met honing.` };
      return { emoji:'🌱', type:'winkel', products:['streekproducten'], tags:[], seasonal:false, desc:`Boerderij- of streekwinkel in ${plaats} met lokale producten.` };
    case 'automaat':
      if (has(/aardappel|piep/i)) return { emoji:'🥔', type:'automaat', products:['aardappelen','groente'], tags:['groente'], seasonal:false, desc:`Aardappelautomaat in ${plaats} met verse aardappelen.` };
      if (has(/vlees|worst/i))    return { emoji:'🥩', type:'automaat', products:['vlees'], tags:['vlees'], seasonal:false, desc:`Vleesautomaat in ${plaats} met vlees van eigen boerderij.` };
      if (has(/kaas/i))           return { emoji:'🧀', type:'automaat', products:['kaas','zuivel'], tags:['zuivel'], seasonal:false, desc:`Kaasautomaat in ${plaats} met streekkaas.` };
      if (has(/honing/i))         return { emoji:'🍯', type:'automaat', products:['honing'], tags:['honing'], seasonal:false, desc:`Honingautomaat in ${plaats} met streekhoning.` };
      if (has(/fruit|aardbei/i))  return { emoji:'🍎', type:'automaat', products:['fruit'], tags:['fruit'], seasonal:false, desc:`Fruitautomaat in ${plaats} met vers fruit.` };
      return { emoji:'🛒', type:'automaat', products:['streekproducten'], tags:[], seasonal:false, desc:`Versautomaat in ${plaats} met streekproducten, dag en nacht.` };
    default: return null;
  }
}

function km(la1, lo1, la2, lo2) {
  const R = 6371, dLa = (la2-la1)*Math.PI/180, dLo = (lo2-lo1)*Math.PI/180;
  const x = Math.sin(dLa/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
  return R*2*Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

let nextId = Math.max(...shops.map(s => s.id)) + 1;
const added = [];
const perCat = {};
const placed = []; // {lat,lng} van nieuw toegevoegde (voor onderlinge dedup)

for (const c of cands) {
  if (!isNL(c.address) || NOISE.has(c.primaryType) || NONFOOD.test(c.name)) continue;
  let cat = categorize(c.name);
  if (!cat && INCLUSIVE) cat = 'algemeen'; // gecurateerde lijst: generieke namen tóch toevoegen
  if (!cat) continue;
  // onderlinge dedup: niet binnen 80m van een al toegevoegde kandidaat
  if (placed.some(p => km(p.lat, p.lng, c.lat, c.lng) < 0.08)) continue;

  const { address, plaats } = cleanAddr(c.address);
  const d = derive(cat, c.name, plaats || 'de buurt');
  if (!d) continue;

  added.push({
    id: nextId++, emoji: d.emoji, name: c.name, type: d.type,
    premium: false, seasonal: d.seasonal,
    lat: +c.lat.toFixed(6), lng: +c.lng.toFixed(6),
    address, hours: null, products: d.products, tags: d.tags,
    placeId: c.placeId, googleRating: null, googleReviews: null,
    dagVers: null, desc: d.desc,
  });
  placed.push({ lat: c.lat, lng: c.lng });
  perCat[cat] = (perCat[cat] || 0) + 1;
}

console.log('Toe te voegen per categorie:');
Object.entries(perCat).sort((a,b)=>b[1]-a[1]).forEach(([k,n])=>console.log('  '+String(n).padStart(3)+'  '+k));
console.log('\nTotaal nieuw:', added.length, '| nieuwe id-reeks vanaf', added[0]?.id, 't/m', added.at(-1)?.id);
console.log('\nSteekproef:');
added.slice(0, 6).forEach(s => console.log(`  ${s.emoji} ${s.name} (${s.type}) — ${s.address}`));

if (WRITE) {
  const merged = [...shops, ...added];
  writeFileSync('src/data/verifiedShops.json', JSON.stringify(merged, null, 2) + '\n', 'utf8');
  console.log(`\nOpgeslagen: ${shops.length} → ${merged.length} winkels.`);
} else {
  console.log('\nDry-run — niets opgeslagen. Voeg --write toe.');
}
