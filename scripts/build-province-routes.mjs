/* Bouw per provincie een fietsroute (cluster van nabije winkels) → routes.json */
import { readFileSync, writeFileSync } from 'fs';
import { provByCoords } from './province.mjs';

const shops = JSON.parse(readFileSync('src/data/verifiedShops.json', 'utf8')).filter(s => s.type !== 'onderweg');

const km = (a, b) => {
  const R = 6371, dLa = (b.lat-a.lat)*Math.PI/180, dLo = (b.lng-a.lng)*Math.PI/180;
  const x = Math.sin(dLa/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLo/2)**2;
  return R*2*Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
};

const META = {
  'Noord-Brabant': { slug:'noord-brabant', emoji:'🌾', titel:'Brabantse Hoevelus',        intro:'Een rondje door het Brabantse zandland langs zuivel, vlees en streekproducten.' },
  'Limburg':       { slug:'limburg',       emoji:'🍇', titel:'Limburgse Streekroute',      intro:'Langs telers en landwinkels door het Maasland en heuvelland.' },
  'Gelderland':    { slug:'gelderland',    emoji:'🍎', titel:'Gelderse Hoevetocht',        intro:'Langs kaasboerderijen, fruittelers en boerderijwinkels.' },
  'Friesland':     { slug:'friesland',     emoji:'🧀', titel:'Friese Zuivelroute',         intro:'Langs melktaps en kaasboerderijen in het weidse Friese land.' },
  'Overijssel':    { slug:'overijssel',    emoji:'🌿', titel:'Twents-Sallandse Route',     intro:'Door het coulisselandschap langs melktaps en boerderijwinkels.' },
  'Zeeland':       { slug:'zeeland',       emoji:'🦪', titel:'Zeeuwse Kleiroute',          intro:'Langs fruit, kaas en streekproducten van de zeeklei.' },
  'Utrecht':       { slug:'utrecht',       emoji:'🍒', titel:'Utrechtse Hoeveroute',       intro:'Langs kaas, fruit en landwinkels rond het Groene Hart en de Heuvelrug.' },
  'Zuid-Holland':  { slug:'zuid-holland',  emoji:'🐄', titel:'Groene Hart-route',          intro:'Langs kaasboerderijen en landwinkels in de Zuid-Hollandse polders.' },
  'Noord-Holland': { slug:'noord-holland', emoji:'🧀', titel:'Noord-Hollandse Kaasroute',  intro:'Langs kaasboerderijen van de Beemster en West-Friesland.' },
  'Flevoland':     { slug:'flevoland',     emoji:'🌷', titel:'Flevolandse Polderroute',    intro:'Door de jonge polders langs automaten en fruittelers.' },
  'Drenthe':       { slug:'drenthe',       emoji:'🌲', titel:'Drentse Esdorpenroute',      intro:'Langs melktaps en boerderijwinkels door brink en bos.' },
  'Groningen':     { slug:'groningen',     emoji:'🌾', titel:'Groninger Wierderoute',      intro:'Langs landwinkels en automaten op het wijde Hogeland.' },
};

const byProv = {};
for (const s of shops) (byProv[provByCoords(s.lat, s.lng)] ??= []).push(s);

const provincieRoutes = [];
for (const [prov, meta] of Object.entries(META)) {
  // Filter niet-winkels (therapie/opvang/manege e.d. die als 'algemeen' zijn ingeslopen)
  const SKIP = /praktijk|therapie|kinderopvang|\bbso\b|manege|camping|stable|brouwerij|distiller/i;
  const list = (byProv[prov] || []).filter(s => !SKIP.test(s.name));
  if (list.length < 4) continue;
  // Densteste seed: minimale som van afstand tot z'n 4 dichtstbijzijnde (vermijdt eilanden/uitschieters)
  let seed = null, bestSpan = Infinity;
  for (const cand of list) {
    const span = list.filter(s => s.id !== cand.id).map(s => km(cand, s)).sort((a, b) => a - b).slice(0, 4).reduce((x, y) => x + y, 0);
    if (span < bestSpan) { bestSpan = span; seed = cand; }
  }
  // Bouw cluster vanaf de seed: stops minstens 2,5 km uit elkaar (echte fietsroute)
  const sorted = list.filter(s => s.id !== seed.id).map(s => ({ s, d: km(seed, s) })).sort((a, b) => a.d - b.d);
  let cluster = [seed];
  for (const { s } of sorted) { if (cluster.length >= 5) break; if (cluster.every(c => km(c, s) >= 2.5)) cluster.push(s); }
  for (const { s } of sorted) { if (cluster.length >= 5) break; if (!cluster.includes(s)) cluster.push(s); } // aanvullen indien dunbevolkt
  // Nearest-neighbour ordenen vanaf de meest noordwestelijke
  let start = cluster.reduce((a, b) => (b.lat - b.lng > a.lat - a.lng ? b : a));
  const ordered = [start]; const rem = cluster.filter(s => s.id !== start.id);
  while (rem.length) {
    const last = ordered[ordered.length - 1];
    let bi = 0, bd = Infinity;
    rem.forEach((s, i) => { const d = km(last, s); if (d < bd) { bd = d; bi = i; } });
    ordered.push(rem.splice(bi, 1)[0]);
  }
  let dist = 0;
  for (let i = 1; i < ordered.length; i++) dist += km(ordered[i-1], ordered[i]);
  const road = Math.round(dist * 1.3);
  provincieRoutes.push({
    id: 'prov-' + meta.slug, provincie: prov, slug: meta.slug,
    titel: meta.titel, emoji: meta.emoji, afstand: road + ' km', intro: meta.intro,
    stopIds: ordered.map(s => s.id),
  });
  console.log(`${prov}: ${road}km — ${ordered.map(s => s.name).join(' → ')}`);
}

const routes = JSON.parse(readFileSync('src/data/routes.json', 'utf8'));
routes.provincieRoutes = provincieRoutes;
writeFileSync('src/data/routes.json', JSON.stringify(routes, null, 2) + '\n', 'utf8');
console.log(`\n${provincieRoutes.length} provincie-routes weggeschreven.`);
