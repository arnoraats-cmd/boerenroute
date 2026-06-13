/* Genereert /gemeente/<plaatsnaam>.html voor plaatsen met ≥3 verkooppunten.
   Targett "boerderijwinkel [plaatsnaam]" — nul concurrentie, hoge koopintentie. */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getProvince, placeOf, provSlug as toProvSlug } from './place-prov.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

const shops = JSON.parse(readFileSync(join(root, 'src/data/verifiedShops.json'), 'utf8'));
const SITE = 'https://www.boerenroute.nl';
const MIN_SHOPS = 3;

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
  const place = placeOf(s);
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
  prov: getProvince(list[0]),
}));

for (const [place, list] of places) {
  const slug = slugify(place);
  const count = list.length;
  const prov = getProvince(list[0]);
  const provSlug = toProvSlug(prov);

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
        <svg class="logo-mark" width="26" height="30" viewBox="0 0 26 30" fill="none" aria-hidden="true"><path d="M13 1.4C6.5 1.4 1.4 6.4 1.4 12.5c0 6.7 8.3 14.6 11 16.9.35.3.85.3 1.2 0 2.7-2.3 11-10.2 11-16.9C24.6 6.4 19.5 1.4 13 1.4Z" fill="#FBEFD6" stroke="#356611" stroke-width="1.7"/><path d="M13 19V9.2" stroke="#356611" stroke-width="1.7" stroke-linecap="round"/><path d="M13 14.2C9.9 14.4 7.4 12.3 7 9.4c3.1-.2 5.6 1.9 6 4.8Z" fill="#5E9420"/><path d="M13 11.4c2.6.1 4.8-1.7 5.2-4.3-2.6-.1-4.8 1.7-5.2 4.3Z" fill="#E8981C"/></svg>
        <span class="logo-text">Boeren<span class="lt-accent">route</span></span>
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
          <svg class="logo-mark" width="22" height="26" viewBox="0 0 26 30" fill="none" aria-hidden="true"><path d="M13 1.4C6.5 1.4 1.4 6.4 1.4 12.5c0 6.7 8.3 14.6 11 16.9.35.3.85.3 1.2 0 2.7-2.3 11-10.2 11-16.9C24.6 6.4 19.5 1.4 13 1.4Z" fill="#FBEFD6" stroke="#356611" stroke-width="1.7"/><path d="M13 19V9.2" stroke="#356611" stroke-width="1.7" stroke-linecap="round"/><path d="M13 14.2C9.9 14.4 7.4 12.3 7 9.4c3.1-.2 5.6 1.9 6 4.8Z" fill="#5E9420"/><path d="M13 11.4c2.6.1 4.8-1.7 5.2-4.3-2.6-.1-4.8 1.7-5.2 4.3Z" fill="#E8981C"/></svg><span class="footer-logo-text">Boeren<span class="lt-accent">route</span></span>
        </a>
        <p class="footer-tagline">Lokaal, vers en op de fiets.</p>
        <div class="footer-social" aria-label="Volg Boerenroute">
          <a href="https://www.facebook.com/profile.php?id=61590474546602" target="_blank" rel="noopener" class="footer-social-link" aria-label="Boerenroute op Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z"/></svg></a>
          <a href="https://www.instagram.com/boerenroute.nl" target="_blank" rel="noopener" class="footer-social-link" aria-label="Boerenroute op Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none"/></svg></a>
        </div>
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
        <svg class="logo-mark" width="26" height="30" viewBox="0 0 26 30" fill="none" aria-hidden="true"><path d="M13 1.4C6.5 1.4 1.4 6.4 1.4 12.5c0 6.7 8.3 14.6 11 16.9.35.3.85.3 1.2 0 2.7-2.3 11-10.2 11-16.9C24.6 6.4 19.5 1.4 13 1.4Z" fill="#FBEFD6" stroke="#356611" stroke-width="1.7"/><path d="M13 19V9.2" stroke="#356611" stroke-width="1.7" stroke-linecap="round"/><path d="M13 14.2C9.9 14.4 7.4 12.3 7 9.4c3.1-.2 5.6 1.9 6 4.8Z" fill="#5E9420"/><path d="M13 11.4c2.6.1 4.8-1.7 5.2-4.3-2.6-.1-4.8 1.7-5.2 4.3Z" fill="#E8981C"/></svg>
        <span class="logo-text">Boeren<span class="lt-accent">route</span></span>
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
        <a href="/" class="footer-logo"><svg class="logo-mark" width="22" height="26" viewBox="0 0 26 30" fill="none" aria-hidden="true"><path d="M13 1.4C6.5 1.4 1.4 6.4 1.4 12.5c0 6.7 8.3 14.6 11 16.9.35.3.85.3 1.2 0 2.7-2.3 11-10.2 11-16.9C24.6 6.4 19.5 1.4 13 1.4Z" fill="#FBEFD6" stroke="#356611" stroke-width="1.7"/><path d="M13 19V9.2" stroke="#356611" stroke-width="1.7" stroke-linecap="round"/><path d="M13 14.2C9.9 14.4 7.4 12.3 7 9.4c3.1-.2 5.6 1.9 6 4.8Z" fill="#5E9420"/><path d="M13 11.4c2.6.1 4.8-1.7 5.2-4.3-2.6-.1-4.8 1.7-5.2 4.3Z" fill="#E8981C"/></svg><span class="footer-logo-text">Boeren<span class="lt-accent">route</span></span></a>
        <p class="footer-tagline">Lokaal, vers en op de fiets.</p>
        <div class="footer-social" aria-label="Volg Boerenroute">
          <a href="https://www.facebook.com/profile.php?id=61590474546602" target="_blank" rel="noopener" class="footer-social-link" aria-label="Boerenroute op Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z"/></svg></a>
          <a href="https://www.instagram.com/boerenroute.nl" target="_blank" rel="noopener" class="footer-social-link" aria-label="Boerenroute op Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none"/></svg></a>
        </div>
      </div>
    </div>
    <div class="footer-bottom"><p>© 2026 Boerenroute.nl</p><a href="/blog/">Verhalen</a></div>
  </footer>
</body>
</html>`;

writeFileSync(join(root, 'public/gemeente/index.html'), indexHtml, 'utf8');
console.log(`\n✓ /gemeente/ index — ${gemeenteIndex.length} plaatsen`);
console.log('\nKlaar.');
