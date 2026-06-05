/* Genereert /gemeente/<plaatsnaam>.html voor plaatsen met ≥3 verkooppunten.
   Targett "boerderijwinkel [plaatsnaam]" — nul concurrentie, hoge koopintentie. */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { provByCoords } from './province.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

const shops = JSON.parse(readFileSync(join(root, 'src/data/verifiedShops.json'), 'utf8'));
const SITE = 'https://www.boerenroute.nl';
const MIN_SHOPS = 3;

const PLACE_TO_PROV = {
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
  'Arnhem':'Gelderland','Barneveld':'Gelderland','Culemborg':'Gelderland',
  'Dalfsen':'Overijssel',
  'Diepenveen':'Gelderland','Doorwerth':'Gelderland','Dreumel':'Gelderland',
  'Haaften':'Gelderland','Harskamp':'Gelderland','Hedel':'Gelderland',
  'Overasselt':'Gelderland','Rha':'Gelderland','Rossum':'Gelderland',
  'Spankeren':'Gelderland','Spijk':'Gelderland','Toldijk':'Gelderland',
  'Velddriel':'Gelderland','Vierakker':'Gelderland','Vorden':'Gelderland',
  'Vragender':'Gelderland','Wageningen':'Gelderland','Wilp':'Gelderland',
  'Bunnik':'Utrecht','De Hoef':'Utrecht','Groenekan':'Utrecht',
  'Leusden':'Utrecht','Woudenberg':'Utrecht',
  'Utrecht (De Meern)':'Utrecht','Utrecht (Haarzuilens)':'Utrecht',
  'Waverveen':'Utrecht',
  'Amsterdam':'Noord-Holland','Avenhorn':'Noord-Holland',
  'Den Helder':'Noord-Holland','Egmond aan den Hoef':'Noord-Holland',
  'Grosthuizen':'Noord-Holland','Schagerbrug':'Noord-Holland',
  'Stompetoren':'Noord-Holland','Warmenhuizen':'Noord-Holland',
  'Wervershoof':'Noord-Holland','Zuidschermer':'Noord-Holland',
  'Alphen aan den Rijn':'Zuid-Holland','Benthuizen':'Zuid-Holland',
  'Bergschenhoek':'Zuid-Holland','Delfgauw':'Zuid-Holland',
  'Den Bommel':'Zuid-Holland','Rhoon':'Zuid-Holland','Wassenaar':'Zuid-Holland',
  'Aagtekerke':'Zeeland','Arnemuiden':'Zeeland','Kattendijke':'Zeeland',
  'Bedum':'Groningen','Bierum':'Groningen','Den Horn':'Groningen',
  'Marum':'Groningen','Mussel':'Groningen',"'t Zandt":'Groningen',
  'Trimunt':'Groningen','Winsum':'Groningen',
  'Burgum':'Friesland','Makkum':'Friesland','Noordwolde':'Friesland',
  'Oosterwolde':'Friesland','Siegerswoude':'Friesland',
  'Twijzel':'Friesland','Tzum':'Friesland',
  'Beilen':'Drenthe','Doldersum':'Drenthe','Geesbrug':'Drenthe',
  'Grolloo':'Drenthe','Nijeveen':'Drenthe','Peize':'Drenthe',
  'Ruinerwold':'Drenthe','Zuidveld':'Drenthe',
};

const PROV_SLUG = {
  'Noord-Brabant':'noord-brabant','Gelderland':'gelderland',
  'Utrecht':'utrecht','Noord-Holland':'noord-holland','Zuid-Holland':'zuid-holland',
  'Zeeland':'zeeland','Groningen':'groningen','Friesland':'friesland',
  'Drenthe':'drenthe','Overijssel':'overijssel','Flevoland':'flevoland','Limburg':'limburg',
};

const TYPE_LABEL = {
  winkel:'Boerderijwinkel', automaat:'Versautomaat',
  zelfpluk:'Zelfpluktuin', markt:'Boerenmarkt', onderweg:'Uitje',
};

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function slugify(s) {
  return String(s ?? '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function shopSlug(s) {
  const base = String(s.name ?? '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${base}-${s.id}`;
}

function hasWinkelPage(s) {
  return s.type !== 'onderweg' && (s.desc || s.hours || s.googleRating);
}

// Groepeer shops op plaatsnaam (excl. onderweg)
const byPlace = {};
for (const s of shops) {
  if (s.type === 'onderweg') continue;
  const place = s.address.replace(/^.*,\s*/, '').trim();
  (byPlace[place] ||= []).push({ ...s, _place: place });
}

// Filter op minimale shopcount
const places = Object.entries(byPlace)
  .filter(([, list]) => list.length >= MIN_SHOPS)
  .sort((a, b) => b[1].length - a[1].length);

mkdirSync(join(root, 'public/gemeente'), { recursive: true });

// Bouw index van alle gemeenten (voor interne links)
const gemeenteIndex = places.map(([place, list]) => ({
  place,
  slug: slugify(place),
  count: list.length,
  prov: PLACE_TO_PROV[place] ?? provByCoords(list[0].lat, list[0].lng),
}));

for (const [place, list] of places) {
  const slug = slugify(place);
  const count = list.length;
  const prov = PLACE_TO_PROV[place] ?? provByCoords(list[0].lat, list[0].lng);
  const provSlug = PROV_SLUG[prov] ?? prov.toLowerCase().replace(/[^a-z]/g, '-');

  // Beschrijf welke types aanwezig zijn
  const typeCount = {};
  list.forEach(s => { typeCount[s.type] = (typeCount[s.type] || 0) + 1; });
  const typeParts = [];
  if (typeCount.winkel)   typeParts.push(`${typeCount.winkel} boerderijwinkel${typeCount.winkel > 1 ? 's' : ''}`);
  if (typeCount.automaat) typeParts.push(`${typeCount.automaat} versautomaat${typeCount.automaat > 1 ? 'en' : ''}`);
  if (typeCount.zelfpluk) typeParts.push(`${typeCount.zelfpluk} zelfpluktuin${typeCount.zelfpluk > 1 ? 'en' : ''}`);
  if (typeCount.markt)    typeParts.push(`${typeCount.markt} boerenmarkt${typeCount.markt > 1 ? 'en' : ''}`);
  const typeSummary = typeParts.join(', ');

  // Producten-opsomming (uniek, top 8)
  const allProducts = [...new Set(list.flatMap(s => s.products || []))].slice(0, 8);

  // Shop-kaarten
  const cards = list.map(s => {
    const inner = `
        <span class="regio-emoji" aria-hidden="true">${s.emoji}</span>
        <div class="regio-info">
          <h2 class="regio-shop-name">${esc(s.name)}</h2>
          <p class="regio-shop-type">${TYPE_LABEL[s.type] ?? s.type} · ${esc(s.address)}</p>
          ${s.products?.length ? `<p class="regio-shop-products">${esc(s.products.slice(0,6).join(', '))}</p>` : ''}
          ${s.hours ? `<p class="regio-shop-hours">🕐 ${esc(s.hours)}</p>` : ''}
          ${s.googleRating ? `<p class="regio-shop-rating">⭐ ${s.googleRating.toFixed(1)}${s.googleReviews ? ` (${s.googleReviews})` : ''}</p>` : ''}
        </div>`;
    return hasWinkelPage(s)
      ? `<a class="regio-shop regio-shop-link" href="/winkel/${shopSlug(s)}">${inner}</a>`
      : `<article class="regio-shop">${inner}</article>`;
  }).join('');

  // Links naar andere gemeenten in dezelfde provincie
  const sameProvLinks = gemeenteIndex
    .filter(g => g.prov === prov && g.slug !== slug)
    .slice(0, 10)
    .map(g => `<a href="/gemeente/${g.slug}" class="regio-link">${esc(g.place)} <span class="regio-link-count">(${g.count})</span></a>`)
    .join('');

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Boerderijwinkels in ${place}`,
    numberOfItems: count,
    url: `${SITE}/gemeente/${slug}`,
    itemListElement: list.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'LocalBusiness',
        name: s.name,
        address: s.address,
        geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng },
      },
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Boerenroute.nl', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: `Boerderijwinkels in ${prov}`, item: `${SITE}/regio/${provSlug}` },
      { '@type': 'ListItem', position: 3, name: `Boerderijwinkels in ${place}`, item: `${SITE}/gemeente/${slug}` },
    ],
  };

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Boerderijwinkels in ${esc(place)} (${count}) — Boerenroute.nl</title>
  <meta name="description" content="Vind ${count} boerderijwinkels, versautomaten en zelfpluktuinen in ${esc(place)}. Verse lokale producten rechtstreeks van de boer.">
  <link rel="canonical" href="${SITE}/gemeente/${slug}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Boerderijwinkels in ${esc(place)} — Boerenroute.nl">
  <meta property="og:description" content="${count} geverifieerde locaties in ${esc(place)} op Boerenroute.nl">
  <meta property="og:url" content="${SITE}/gemeente/${slug}">
  <meta property="og:image" content="${SITE}/public/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Boerderijwinkels in ${esc(place)} — Boerenroute.nl">
  <meta name="twitter:description" content="${count} geverifieerde locaties in ${esc(place)}. Verse producten rechtstreeks van de boer.">
  <meta name="twitter:image" content="${SITE}/public/og-image.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../styles/main.css">
  <script type="application/ld+json">${JSON.stringify(itemListSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
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
        <a href="/">Boerenroute.nl</a> › <a href="/regio/${provSlug}">${esc(prov)}</a> › ${esc(place)}
      </nav>

      <h1 class="regio-title">Boerderijwinkels in ${esc(place)}</h1>
      <p class="regio-intro">
        Er staan <strong>${count} geverifieerde locaties</strong> in ${esc(place)} op Boerenroute.nl —
        ${typeSummary}.${allProducts.length ? ` Producten: ${esc(allProducts.join(', '))}.` : ''}
        <a href="/">Bekijk ze op de kaart →</a>
      </p>

      <div class="regio-shops">${cards}</div>

      <div class="regio-cta">
        <a href="/" class="btn btn-green">🗺️ Bekijk op de kaart</a>
        <a href="/aanmelden" class="btn btn-ghost">🌾 Winkel aanmelden</a>
      </div>

      ${sameProvLinks ? `
      <nav class="regio-more" aria-label="Boerderijwinkels in andere plaatsen in ${esc(prov)}">
        <h2 class="regio-more-title">Boerderijwinkels in andere plaatsen in ${esc(prov)}</h2>
        <div class="regio-links">${sameProvLinks}</div>
        <p style="margin-top:12px"><a href="/regio/${provSlug}" class="regio-link">Alle boerderijwinkels in ${esc(prov)} →</a></p>
        <p class="regio-more-blog"><a href="/blog/">📖 Lees ook: verhalen &amp; seizoenstips →</a></p>
      </nav>` : ''}
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
      <a href="/blog/">Verhalen</a>
    </div>
  </footer>
</body>
</html>`;

  writeFileSync(join(root, `public/gemeente/${slug}.html`), html, 'utf8');
  console.log(`✓ /gemeente/${slug} — ${count} shops (${prov})`);
}

// Schrijf ook een index-pagina voor /gemeente/
const indexCards = gemeenteIndex
  .map(g => `<a href="/gemeente/${g.slug}" class="regio-link">${esc(g.place)} <span class="regio-link-count">(${g.count})</span></a>`)
  .join('');

const indexHtml = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Boerderijwinkels per gemeente — Boerenroute.nl</title>
  <meta name="description" content="Vind boerderijwinkels, versautomaten en zelfpluktuinen in jouw gemeente. Overzicht van alle plaatsen op Boerenroute.nl.">
  <link rel="canonical" href="${SITE}/gemeente/">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../styles/main.css">
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
        <a href="/">Boerenroute.nl</a> › Gemeenten
      </nav>
      <h1 class="regio-title">Boerderijwinkels per gemeente</h1>
      <p class="regio-intro">Kies een gemeente om alle boerderijwinkels, versautomaten en zelfpluktuinen in die plaats te bekijken.</p>
      <nav class="regio-links" aria-label="Gemeenten">${indexCards}</nav>
      <div class="regio-cta" style="margin-top:32px">
        <a href="/" class="btn btn-green">🗺️ Bekijk alle locaties op de kaart</a>
      </div>
    </div>
  </main>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <a href="/" class="footer-logo"><span aria-hidden="true">🌾</span> Boeren<strong>route.nl</strong></a>
        <p class="footer-tagline">Lokaal, vers en op de fiets.</p>
      </div>
    </div>
    <div class="footer-bottom"><p>© 2026 Boerenroute.nl</p><a href="/blog/">Verhalen</a></div>
  </footer>
</body>
</html>`;

writeFileSync(join(root, 'public/gemeente/index.html'), indexHtml, 'utf8');
console.log(`\n✓ /gemeente/ index — ${gemeenteIndex.length} plaatsen`);
console.log('\nKlaar.');
