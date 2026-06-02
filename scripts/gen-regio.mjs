/* Genereert public/regio/<provincie>.html per provincie */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

const shops = JSON.parse(readFileSync(join(root, 'src/data/verifiedShops.json'), 'utf8'));

const PLACE_TO_PROV = {
  // Noord-Brabant
  'Uden':'Noord-Brabant','Volkel':'Noord-Brabant','Nistelrode':'Noord-Brabant',
  'Erp':'Noord-Brabant','Veghel':'Noord-Brabant','Boekel':'Noord-Brabant',
  'De Moer':'Noord-Brabant','Den Dungen':'Noord-Brabant','Deurne':'Noord-Brabant',
  'Eindhoven':'Noord-Brabant','Genderen':'Noord-Brabant','Goirle':'Noord-Brabant',
  'Helvoirt':'Noord-Brabant','Hilvarenbeek':'Noord-Brabant','Liempde':'Noord-Brabant',
  'Maarheeze':'Noord-Brabant','Made':'Noord-Brabant','Heukelom':'Noord-Brabant',
  'Hooge Zwaluwe':'Noord-Brabant','Breda':'Noord-Brabant','Riel':'Noord-Brabant',
  'Rucphen':'Noord-Brabant','Ulicoten':'Noord-Brabant','Ommel':'Noord-Brabant',
  "Zeeland":'Noord-Brabant',"'s-Hertogenbosch":'Noord-Brabant',
  // Gelderland
  'Arnhem':'Gelderland','Culemborg':'Gelderland','Doorwerth':'Gelderland',
  'Diepenveen':'Gelderland','Wageningen':'Gelderland','Rha':'Gelderland',
  'Spankeren':'Gelderland','Toldijk':'Gelderland','Vorden':'Gelderland',
  'Vragender':'Gelderland','Wilp':'Gelderland','Barneveld':'Gelderland',
  // Utrecht
  'Bunnik':'Utrecht','De Hoef':'Utrecht','Groenekan':'Utrecht',
  'Leusden':'Utrecht','Woudenberg':'Utrecht',
  "Utrecht (De Meern)":'Utrecht',"Utrecht (Haarzuilens)":'Utrecht',
  // Noord-Holland
  'Amsterdam':'Noord-Holland','Avenhorn':'Noord-Holland','Grosthuizen':'Noord-Holland',
  'Stompetoren':'Noord-Holland','Schagerbrug':'Noord-Holland','Warmenhuizen':'Noord-Holland',
  // Zuid-Holland
  'Bergschenhoek':'Zuid-Holland','Delfgauw':'Zuid-Holland','Den Bommel':'Zuid-Holland',
  'Rhoon':'Zuid-Holland','Wassenaar':'Zuid-Holland','Tholen':'Zeeland',
  // Drenthe
  'Beilen':'Drenthe','Geesbrug':'Drenthe','Grolloo':'Drenthe',
  'Peize':'Drenthe','Zuidveld':'Drenthe',
  // Groningen
  'Bedum':'Groningen','Trimunt':'Groningen',"'t Zandt":'Groningen','Marum':'Groningen',
  'Den Horn':'Groningen',
  // Friesland
  'Burgum':'Friesland','Makkum':'Friesland','Twijzel':'Friesland',
  'Siegerswoude':'Friesland','Noordwolde':'Friesland',
  // Overijssel
  'Enschede':'Overijssel','Hertme':'Overijssel','Glane':'Overijssel',
  // Zeeland
  'Kattendijke':'Zeeland','Lewedorp':'Zeeland',
  // Limburg
  'Eckelrade':'Limburg','Heerlen':'Limburg','Mechelen':'Limburg',
  'Maria Hoop':'Limburg','Neer':'Limburg','Schin op Geul':'Limburg',
  'Ysselsteyn':'Limburg','Spaubeek':'Limburg',
  // Flevoland
  'Emmeloord':'Flevoland','Lelystad':'Flevoland','Zeewolde':'Flevoland',
  'Waverveen':'Utrecht', // Waverveen is gemeente De Ronde Venen, Utrecht
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

for (const [prov, shopList] of Object.entries(byProv)) {
  if (prov === 'Overig') continue; // sla overig over
  const slug  = prov.toLowerCase().replace(/[^a-z]/g, '-');
  const count = shopList.length;

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
      <p>© 2025 Boerenroute.nl</p>
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
