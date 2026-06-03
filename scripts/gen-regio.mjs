/* Genereert public/regio/<provincie>.html per provincie */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

const shops = JSON.parse(readFileSync(join(root, 'src/data/verifiedShops.json'), 'utf8'));

const PLACE_TO_PROV = {
  // ── Noord-Brabant ──────────────────────────────────────────────
  'Aarle-Rixtel':'Noord-Brabant','Asten':'Noord-Brabant','Best':'Noord-Brabant',
  'Beek en Donk':'Noord-Brabant','Berlicum':'Noord-Brabant','Biezenmortel':'Noord-Brabant',
  'Bladel':'Noord-Brabant','Boekel':'Noord-Brabant','Boxtel':'Noord-Brabant',
  'Breda':'Noord-Brabant','Budel':'Noord-Brabant','Casteren':'Noord-Brabant',
  'De Moer':'Noord-Brabant','Den Dungen':'Noord-Brabant','Deurne':'Noord-Brabant',
  'Diessen':'Noord-Brabant','Dongen':'Noord-Brabant','Drunen':'Noord-Brabant',
  'Eerde':'Noord-Brabant','Eindhoven':'Noord-Brabant','Elshout':'Noord-Brabant',
  'Erp':'Noord-Brabant','Etten-Leur':'Noord-Brabant','Genderen':'Noord-Brabant',
  'Goirle':'Noord-Brabant','Halsteren':'Noord-Brabant','Haaren':'Noord-Brabant',
  'Heesch':'Noord-Brabant','Heeswijk-Dinther':'Noord-Brabant','Heeze':'Noord-Brabant',
  'Helmond':'Noord-Brabant','Helvoirt':'Noord-Brabant','Heerle':'Noord-Brabant',
  'Heukelom':'Noord-Brabant','Hilvarenbeek':'Noord-Brabant',
  'Hoogeloon':'Noord-Brabant','Hooge Zwaluwe':'Noord-Brabant',
  'Knapersven 36, Mariahout':'Noord-Brabant',
  'Liempde':'Noord-Brabant','Lithoijen':'Noord-Brabant','Loon op Zand':'Noord-Brabant',
  'Maarheeze':'Noord-Brabant','Made':'Noord-Brabant','Mariahout':'Noord-Brabant',
  'Maren-Kessel':'Noord-Brabant','Moergestel':'Noord-Brabant',
  'Nistelrode':'Noord-Brabant','Nuenen':'Noord-Brabant','Nuland':'Noord-Brabant',
  'Oirschot':'Noord-Brabant','Oisterwijk':'Noord-Brabant','Ommel':'Noord-Brabant',
  'Oosterhout':'Noord-Brabant','Oss':'Noord-Brabant',
  'Oost West en Middelbeers':'Noord-Brabant',
  'Reek':'Noord-Brabant','Riel':'Noord-Brabant','Rijkevoort':'Noord-Brabant',
  'Rosmalen':'Noord-Brabant','Rucphen':'Noord-Brabant',
  'Schijndel':'Noord-Brabant','Sint-Michielsgestel':'Noord-Brabant',
  'Sint-Oedenrode':'Noord-Brabant','Soerendonk':'Noord-Brabant','Someren':'Noord-Brabant',
  'Son en Breugel':'Noord-Brabant','Sprundel':'Noord-Brabant',
  'Tilburg':'Noord-Brabant','Uden':'Noord-Brabant','Udenhout':'Noord-Brabant',
  'Ulicoten':'Noord-Brabant','Veghel':'Noord-Brabant','Veldhoven':'Noord-Brabant',
  'Vinkel':'Noord-Brabant','Vlijmen':'Noord-Brabant','Volkel':'Noord-Brabant',
  'Vught':'Noord-Brabant','Waspik':'Noord-Brabant','Wintelre':'Noord-Brabant',
  'Zeeland':'Noord-Brabant',"'s-Hertogenbosch":'Noord-Brabant',
  'Bergen op Zoom':'Noord-Brabant',

  // ── Gelderland ─────────────────────────────────────────────────
  'Arnhem':'Gelderland','Barneveld':'Gelderland','Culemborg':'Gelderland',
  'Diepenveen':'Gelderland','Doorwerth':'Gelderland','Dreumel':'Gelderland',
  'Haaften':'Gelderland','Harskamp':'Gelderland','Hedel':'Gelderland',
  'Overasselt':'Gelderland','Rha':'Gelderland','Rossum':'Gelderland',
  'Spankeren':'Gelderland','Spijk':'Gelderland','Toldijk':'Gelderland',
  'Velddriel':'Gelderland','Vierakker':'Gelderland','Vorden':'Gelderland',
  'Vragender':'Gelderland','Wageningen':'Gelderland','Wilp':'Gelderland',

  // ── Utrecht ────────────────────────────────────────────────────
  'Bunnik':'Utrecht','De Hoef':'Utrecht','Groenekan':'Utrecht',
  'Leusden':'Utrecht','Woudenberg':'Utrecht',
  'Utrecht (De Meern)':'Utrecht','Utrecht (Haarzuilens)':'Utrecht',
  'Waverveen':'Utrecht',

  // ── Noord-Holland ──────────────────────────────────────────────
  'Amsterdam':'Noord-Holland','Avenhorn':'Noord-Holland',
  'Den Helder':'Noord-Holland','Egmond aan den Hoef':'Noord-Holland',
  'Grosthuizen':'Noord-Holland','Schagerbrug':'Noord-Holland',
  'Stompetoren':'Noord-Holland','Warmenhuizen':'Noord-Holland',
  'Wervershoof':'Noord-Holland','Zuidschermer':'Noord-Holland',

  // ── Zuid-Holland ───────────────────────────────────────────────
  'Alphen aan den Rijn':'Zuid-Holland','Benthuizen':'Zuid-Holland',
  'Bergschenhoek':'Zuid-Holland','Delfgauw':'Zuid-Holland',
  'Den Bommel':'Zuid-Holland','Rhoon':'Zuid-Holland','Wassenaar':'Zuid-Holland',

  // ── Zeeland ────────────────────────────────────────────────────
  'Aagtekerke':'Zeeland','Arnemuiden':'Zeeland','Kattendijke':'Zeeland',
  'Kerkwerve':'Zeeland','Koudekerke':'Zeeland','Lewedorp':'Zeeland',
  'Nieuwerkerk':'Zeeland','Oud-Vossemeer':'Zeeland','Schoondijke':'Zeeland',
  'Tholen':'Zeeland',

  // ── Limburg ────────────────────────────────────────────────────
  'Eckelrade':'Limburg','Heerlen':'Limburg','Kessel':'Limburg',
  'Maria Hoop':'Limburg','Mechelen':'Limburg','Neer':'Limburg',
  'Schin op Geul':'Limburg','Sevenum':'Limburg','Spaubeek':'Limburg',
  'Velden':'Limburg','Weert':'Limburg','Ysselsteyn':'Limburg',

  // ── Overijssel ─────────────────────────────────────────────────
  'Bruchterveld':'Overijssel','Dalfsen':'Overijssel','Dalmsholte':'Overijssel',
  'Enschede':'Overijssel','Glane':'Overijssel','Hertme':'Overijssel',
  'Wierden':'Overijssel','Zwolle':'Overijssel',

  // ── Flevoland ──────────────────────────────────────────────────
  'Dronten':'Flevoland','Emmeloord':'Flevoland',
  'Lelystad':'Flevoland','Zeewolde':'Flevoland',

  // ── Groningen ──────────────────────────────────────────────────
  'Bedum':'Groningen','Bierum':'Groningen','Den Horn':'Groningen',
  'Marum':'Groningen','Mussel':'Groningen',"'t Zandt":'Groningen',
  'Trimunt':'Groningen','Winsum':'Groningen',

  // ── Friesland ──────────────────────────────────────────────────
  'Burgum':'Friesland','Makkum':'Friesland','Noordwolde':'Friesland',
  'Oosterwolde':'Friesland','Siegerswoude':'Friesland',
  'Twijzel':'Friesland','Tzum':'Friesland',

  // ── Drenthe ────────────────────────────────────────────────────
  'Beilen':'Drenthe','Doldersum':'Drenthe','Geesbrug':'Drenthe',
  'Grolloo':'Drenthe','Nijeveen':'Drenthe','Peize':'Drenthe',
  'Ruinerwold':'Drenthe','Zuidveld':'Drenthe',
};

const TYPE_LABEL = {
  winkel: 'Boerderijwinkel', automaat: 'Versautomaat',
  zelfpluk: 'Zelfpluk', markt: 'Boerenmarkt', onderweg: 'Uitje',
};

// Koppel provinciie aan elk shop
const byProv = {};
for (const s of shops) {
  if (s.type === 'onderweg') continue;
  const place = s.address.replace(/^.*,\s*/, '').trim();
  const prov  = PLACE_TO_PROV[place] ?? 'Overig';
  if (!byProv[prov]) byProv[prov] = [];
  byProv[prov].push({ ...s, _place: place });
}

mkdirSync(join(root, 'public/regio'), { recursive: true });

/* Index van alle provincies voor onderlinge links (SEO: intern linknetwerk) */
const provIndex = Object.entries(byProv)
  .filter(([p]) => p !== 'Overig')
  .map(([p, list]) => ({ prov: p, slug: p.toLowerCase().replace(/[^a-z]/g, '-'), count: list.length }))
  .sort((a, b) => b.count - a.count);

for (const [prov, shopList] of Object.entries(byProv)) {
  if (prov === 'Overig') continue; // sla overig over
  const slug  = prov.toLowerCase().replace(/[^a-z]/g, '-');
  const count = shopList.length;

  /* Links naar de andere provincies + de blog */
  const otherProvLinks = provIndex
    .filter(p => p.slug !== slug)
    .map(p => `<a href="/regio/${p.slug}" class="regio-link">${p.prov} <span class="regio-link-count">(${p.count})</span></a>`)
    .join('');

  const rows = shopList.map(s => `
  <article class="regio-shop">
    <span class="regio-emoji" aria-hidden="true">${s.emoji}</span>
    <div class="regio-info">
      <h2 class="regio-shop-name">${esc(s.name)}</h2>
      <p class="regio-shop-type">${TYPE_LABEL[s.type] ?? s.type} · ${esc(s.address)}</p>
      ${s.products?.length ? `<p class="regio-shop-products">${esc(s.products.slice(0,6).join(', '))}</p>` : ''}
      ${s.hours ? `<p class="regio-shop-hours">🕐 ${esc(s.hours)}</p>` : ''}
      ${s.googleRating ? `<p class="regio-shop-rating">⭐ ${s.googleRating.toFixed(1)}${s.googleReviews ? ` (${s.googleReviews})` : ''}</p>` : ''}
    </div>
  </article>`).join('');

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Boerderijwinkels in ${prov} — Boerenroute.nl</title>
  <meta name="description" content="Ontdek ${count} boerderijwinkels, eierautomaten en versautomaten in ${prov}. Verse producten rechtstreeks van de boer.">
  <link rel="canonical" href="https://www.boerenroute.nl/regio/${slug}">
  <meta property="og:title" content="Boerderijwinkels in ${prov}">
  <meta property="og:description" content="${count} geverifieerde locaties in ${prov} op Boerenroute.nl">
  <meta property="og:url" content="https://www.boerenroute.nl/regio/${slug}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../styles/main.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Boerderijwinkels in ${prov}",
    "numberOfItems": ${count},
    "url": "https://www.boerenroute.nl/regio/${slug}",
    "itemListElement": [${shopList.map((s,i) => `{
      "@type": "ListItem",
      "position": ${i+1},
      "item": {
        "@type": "LocalBusiness",
        "name": "${esc(s.name)}",
        "address": "${esc(s.address)}",
        "geo": { "@type": "GeoCoordinates", "latitude": ${s.lat}, "longitude": ${s.lng} }
      }
    }`).join(',')}]
  }
  </script>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <a href="/" class="logo" aria-label="Boerenroute.nl home">
        <span class="logo-icon" aria-hidden="true">🌾</span>
        <span class="logo-text">Boeren<strong>route.nl</strong></span>
      </a>
    </div>
  </header>

  <main class="regio-main">
    <div class="regio-container">
      <nav class="regio-breadcrumb" aria-label="Broodkruimelpad">
        <a href="/">Boerenroute.nl</a> › ${prov}
      </nav>

      <h1 class="regio-title">Boerderijwinkels in ${prov}</h1>
      <p class="regio-intro">
        Er staan <strong>${count} geverifieerde locaties</strong> in ${prov} op Boerenroute.nl —
        boerderijwinkels, versautomaten en zelfpluktuinen met verse, lokale producten.
        <a href="/#kaart">Bekijk ze op de kaart →</a>
      </p>

      <div class="regio-shops">
        ${rows}
      </div>

      <div class="regio-cta">
        <a href="/" class="btn btn-green">🗺️ Bekijk alle locaties op de kaart</a>
        <p class="regio-cta-sub">Of zoek op een specifieke plaats, naam of product.</p>
      </div>

      <nav class="regio-more" aria-label="Boerderijwinkels in andere provincies">
        <h2 class="regio-more-title">Boerderijwinkels in andere provincies</h2>
        <div class="regio-links">${otherProvLinks}</div>
        <p class="regio-more-blog"><a href="/blog/">📖 Lees ook: verhalen &amp; seizoenstips →</a></p>
      </nav>
    </div>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <a href="/" class="footer-logo">
          <span aria-hidden="true">🌾</span> Boeren<strong>route.nl</strong>
        </a>
        <p class="footer-tagline">Lokaal, vers en op de fiets.</p>
      </div>
    </div>
    <div class="footer-bottom">
      <p>© 2026 Boerenroute.nl</p>
      <a href="https://boerenroute.goatcounter.com" rel="noopener">Privacy-statistieken</a>
    </div>
  </footer>
</body>
</html>`;

  writeFileSync(join(root, `public/regio/${slug}.html`), html, 'utf8');
  console.log(`✓ ${prov}: ${count} shops → public/regio/${slug}.html`);
}

console.log('\nKlaar.');

function esc(s) {
  return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
