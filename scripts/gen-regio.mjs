/* Genereert public/regio/<provincie>.html per provincie */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getProvince, placeOf, provSlug } from './place-prov.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

const shops = JSON.parse(readFileSync(join(root, 'src/data/verifiedShops.json'), 'utf8'));
const byId  = Object.fromEntries(shops.map(s => [s.id, s]));
const provRoutes = (() => {
  try { return JSON.parse(readFileSync(join(root, 'src/data/routes.json'), 'utf8')).provincieRoutes || []; }
  catch { return []; }
})();

const TYPE_LABEL = {
  winkel: 'Boerderijwinkel', automaat: 'Versautomaat',
  zelfpluk: 'Zelfpluk', markt: 'Boerenmarkt', onderweg: 'Uitje',
};

// Koppel provincie aan elk shop (plaatsnaam eerst, anders coördinaten)
const byProv = {};
for (const s of shops) {
  if (s.type === 'onderweg') continue;
  const place = placeOf(s);
  const prov  = getProvince(s);
  if (!byProv[prov]) byProv[prov] = [];
  byProv[prov].push({ ...s, _place: place });
}

mkdirSync(join(root, 'public/regio'), { recursive: true });

/* Index van alle provincies voor onderlinge links (SEO: intern linknetwerk) */
const provIndex = Object.entries(byProv)
  .filter(([p]) => p !== 'Overig')
  .map(([p, list]) => ({ prov: p, slug: provSlug(p), count: list.length }))
  .sort((a, b) => b.count - a.count);

for (const [prov, shopList] of Object.entries(byProv)) {
  if (prov === 'Overig') continue; // sla overig over
  const slug  = provSlug(prov);
  const count = shopList.length;

  /* Links naar de andere provincies + de blog */
  const otherProvLinks = provIndex
    .filter(p => p.slug !== slug)
    .map(p => `<a href="/regio/${p.slug}" class="regio-link">${p.prov} <span class="regio-link-count">(${p.count})</span></a>`)
    .join('');

  /* Provincie-fietsroute (indien beschikbaar) */
  const route = provRoutes.find(r => r.provincie === prov);
  const routeBlock = route ? (() => {
    const stops = route.stopIds.map(id => byId[id]).filter(Boolean);
    const items = stops.map((s, i) => `
          <li class="regioroute-stop"><span class="regioroute-num">${i + 1}</span>
            <span class="regioroute-emoji">${s.emoji}</span>
            <span class="regioroute-name">${esc(s.name)}</span></li>`).join('');
    return `
      <section class="regioroute" aria-label="Fietsroute in ${prov}">
        <h2 class="regioroute-title">${route.emoji} Fietsroute: ${esc(route.titel)}</h2>
        <p class="regioroute-intro">${esc(route.intro)} <strong>${esc(route.afstand)}</strong> · ${stops.length} stops.</p>
        <ol class="regioroute-stops">${items}</ol>
        <a class="btn btn-green" href="/?route=${route.stopIds.join(',')}">🚴 Laad deze route in de planner</a>
      </section>`;
  })() : '';

  /* Groepeer per gemeente (plaats) → lokale long-tail ("boerderijwinkel <plaats>")
     + nette kop-hiërarchie (H1 provincie › H2 gemeente › H3 winkel) */
  const byPlace = {};
  for (const s of shopList) {
    const p = (s._place || 'Overig').trim();
    (byPlace[p] ||= []).push(s);
  }
  const placeGroups = Object.entries(byPlace)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'nl'));

  const groupsHtml = placeGroups.map(([place, list]) => {
    const cards = list.map(s => {
      const inner = `
        <span class="regio-emoji" aria-hidden="true">${s.emoji}</span>
        <div class="regio-info">
          <h3 class="regio-shop-name">${esc(s.name)}</h3>
          <p class="regio-shop-type">${TYPE_LABEL[s.type] ?? s.type} · ${esc(s.address)}</p>
          ${s.products?.length ? `<p class="regio-shop-products">${esc(s.products.slice(0,6).join(', '))}</p>` : ''}
          ${s.hours ? `<p class="regio-shop-hours">🕐 ${esc(s.hours)}</p>` : ''}
          ${s.googleRating ? `<p class="regio-shop-rating">⭐ ${s.googleRating.toFixed(1)}${s.googleReviews ? ` (${s.googleReviews})` : ''}</p>` : ''}
        </div>`;
      return hasWinkelPage(s)
        ? `<a class="regio-shop regio-shop-link" href="/winkel/${shopSlug(s)}">${inner}</a>`
        : `<article class="regio-shop">${inner}</article>`;
    }).join('');
    return `
      <section class="regio-place" id="${slugify(place)}">
        <h2 class="regio-place-title">Boerderijwinkels in ${esc(place)} <span class="regio-place-count">${list.length}</span></h2>
        <div class="regio-shops">${cards}</div>
      </section>`;
  }).join('');

  /* Snel-navigatie naar de gemeenten (interne ankerlinks) */
  const navPlaces = placeGroups.filter(([, l]) => l.length >= 3);
  const placeNav = navPlaces.length > 1
    ? `<nav class="regio-placenav" aria-label="Spring naar plaats">
        <span class="regio-placenav-label">Plaatsen:</span>${navPlaces
        .map(([p, l]) => `<a href="#${slugify(p)}">${esc(p)} <span>${l.length}</span></a>`).join('')}</nav>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Boerderijwinkels in ${prov} — Boerenroute.nl</title>
  <meta name="description" content="Ontdek ${count} boerderijwinkels, eierautomaten en versautomaten in ${prov}. Verse producten rechtstreeks van de boer.">
  <link rel="canonical" href="https://www.boerenroute.nl/regio/${slug}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Boerderijwinkels in ${prov}">
  <meta property="og:description" content="${count} geverifieerde locaties in ${prov} op Boerenroute.nl">
  <meta property="og:url" content="https://www.boerenroute.nl/regio/${slug}">
  <meta property="og:image" content="https://www.boerenroute.nl/public/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Boerderijwinkels in ${prov} — Boerenroute.nl">
  <meta name="twitter:description" content="${count} geverifieerde locaties in ${prov}. Verse producten rechtstreeks van de boer.">
  <meta name="twitter:image" content="https://www.boerenroute.nl/public/og-image.png">
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
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Boerenroute.nl", "item": "https://www.boerenroute.nl/" },
      { "@type": "ListItem", "position": 2, "name": "Boerderijwinkels in ${prov}", "item": "https://www.boerenroute.nl/regio/${slug}" }
    ]
  }
  </script>
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
        <a href="/">Boerenroute.nl</a> › ${prov}
      </nav>

      <h1 class="regio-title">Boerderijwinkels in ${prov}</h1>
      <p class="regio-intro">
        Er staan <strong>${count} geverifieerde locaties</strong> in ${prov} op Boerenroute.nl —
        boerderijwinkels, versautomaten en zelfpluktuinen met verse, lokale producten.
        <a href="/#kaart">Bekijk ze op de kaart →</a>
      </p>

      ${placeNav}
      ${groupsHtml}
${routeBlock}
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

function slugify(s) {
  return 'plaats-' + String(s ?? '').toLowerCase()
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
