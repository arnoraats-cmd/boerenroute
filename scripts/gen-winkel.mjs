/* Genereert /winkel/<naam-id>.html per verkooppunt met voldoende data.
   Doel: branded + lokale zoekopdrachten, LocalBusiness rich results. */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getProvince, placeOf, provSlug as toProvSlug } from './place-prov.mjs';
import { slugify, shopSlug, hasWinkelPage } from './shop-url.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

const shops = JSON.parse(readFileSync(join(root, 'src/data/verifiedShops.json'), 'utf8'));
const SITE = 'https://www.boerenroute.nl';


const TYPE_LABEL = {
  winkel:'Boerderijwinkel', automaat:'Versautomaat',
  zelfpluk:'Zelfpluktuin', markt:'Boerenmarkt', onderweg:'Uitje',
};

const TYPE_DESC = {
  winkel: 'een boerderijwinkel',
  automaat: 'een versautomaat',
  zelfpluk: 'een zelfpluktuin',
  markt: 'een boerenmarkt',
};

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* Nette Nederlandse opsomming: "a, b en c". */
function naturalList(items) {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} en ${a[a.length - 1]}`;
}

/* Tweede, inhoudelijke alinea per winkel — uit de échte data, met een
   id-gebaseerde template-rotatie zodat pagina's onderling verschillen i.p.v.
   identiek gesjabloneerd te zijn (en stabiel blijven bij regeneratie).
   Sociaal bewijs alleen als er een echte rating is (geen verzinsels). */
function contextParagraph(s, place, prov) {
  const out = [];

  if (s.products?.length) {
    const prods = naturalList(s.products.slice(0, 5).map(esc));
    const intros = [
      `Bij ${esc(s.name)} in ${esc(place)} vind je ${prods}`,
      `${esc(s.name)} in ${esc(place)} biedt ${prods}`,
      `Voor ${prods} kun je terecht bij ${esc(s.name)} in ${esc(place)}`,
    ];
    out.push(`${intros[s.id % intros.length]} — vers en uit de streek.`);
  } else {
    out.push(`${esc(s.name)} is ${TYPE_DESC[s.type] || 'een lokaal adres'} in ${esc(place)} (${esc(prov)}).`);
  }

  const routeLines = [
    `${esc(place)} ligt in ${esc(prov)}; combineer dit adres met andere boerderijwinkels in de buurt tot een fietstocht.`,
    `Plan ${esc(s.name)} in een fietsroute langs meer verse adressen in ${esc(prov)}.`,
    `Onderweg in ${esc(prov)}? Neem ${esc(place)} mee in een fietsroute langs lokale boeren.`,
  ];
  out.push(routeLines[s.id % routeLines.length]);

  if (s.googleRating) {
    out.push(`Bezoekers geven gemiddeld ${s.googleRating.toFixed(1)}★${s.googleReviews ? ` (${s.googleReviews} beoordelingen)` : ''}.`);
  }

  return out.join(' ');
}

// Groepeer per plaatsnaam voor 'ook in deze plaats'-links
const byPlace = {};
for (const s of shops) {
  if (s.type === 'onderweg') continue;
  const place = placeOf(s);
  (byPlace[place] ||= []).push(s);
}

mkdirSync(join(root, 'public/winkel'), { recursive: true });

// Filter: excl. onderweg, moet desc of hours of rating hebben
const eligible = shops.filter(hasWinkelPage);

let count = 0;

for (const s of eligible) {
  const place = placeOf(s);
  const prov  = getProvince(s);
  const provSlug = toProvSlug(prov);
  const placeSlug = slugify(place);
  const slug = shopSlug(s);
  const url  = `${SITE}/winkel/${slug}`;

  // Nabijgelegen shops in dezelfde plaats (excl. zichzelf, max 4)
  const nearby = (byPlace[place] || [])
    .filter(o => o.id !== s.id && o.type !== 'onderweg')
    .slice(0, 4);

  // Google Maps link
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`;

  // LocalBusiness schema
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: s.name,
    description: s.desc || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: s.address.replace(/,\s*[^,]+$/, ''),
      addressLocality: place,
      addressCountry: 'NL',
    },
    geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng },
    url: s.website || url,
    aggregateRating: s.googleRating ? {
      '@type': 'AggregateRating',
      ratingValue: s.googleRating,
      reviewCount: s.googleReviews || 1,
      bestRating: 5,
    } : undefined,
  };
  // Verwijder undefined velden
  Object.keys(schema).forEach(k => schema[k] === undefined && delete schema[k]);
  if (!schema.aggregateRating) delete schema.aggregateRating;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Boerenroute.nl', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: `Boerderijwinkels in ${prov}`, item: `${SITE}/regio/${provSlug}` },
      { '@type': 'ListItem', position: 3, name: s.name, item: url },
    ],
  };

  const metaDesc = s.desc
    ? `${s.desc.slice(0, 140)}${s.desc.length > 140 ? '…' : ''}`
    : `${esc(s.name)} in ${esc(place)} — ${TYPE_LABEL[s.type] ?? s.type} met ${s.products?.slice(0,3).join(', ') || 'lokale producten'} rechtstreeks van de boer.`;

  const nearbyHtml = nearby.length ? `
    <section class="winkel-nearby">
      <h2 class="winkel-nearby-title">Ook in ${esc(place)}</h2>
      <div class="regio-shops">
        ${nearby.map(o => `
        <a class="regio-shop winkel-nearby-card" href="/winkel/${shopSlug(o)}" style="text-decoration:none">
          <span class="regio-emoji" aria-hidden="true">${o.emoji}</span>
          <div class="regio-info">
            <p class="regio-shop-name">${esc(o.name)}</p>
            <p class="regio-shop-type">${TYPE_LABEL[o.type] ?? o.type}</p>
            ${o.googleRating ? `<p class="regio-shop-rating">⭐ ${o.googleRating.toFixed(1)}</p>` : ''}
          </div>
        </a>`).join('')}
      </div>
    </section>` : '';

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(s.name)} — ${esc(place)} — Boerenroute.nl</title>
  <meta name="description" content="${esc(metaDesc)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="place">
  <meta property="og:title" content="${esc(s.name)} — Boerenroute.nl">
  <meta property="og:description" content="${esc(metaDesc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/public/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(s.name)} — Boerenroute.nl">
  <meta name="twitter:description" content="${esc(metaDesc)}">
  <meta name="twitter:image" content="${SITE}/public/og-image.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../styles/main.css">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
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
        <a href="/">Boerenroute.nl</a> ›
        <a href="/regio/${provSlug}">${esc(prov)}</a> ›
        ${byPlace[place]?.length >= 3
          ? `<a href="/gemeente/${placeSlug}">${esc(place)}</a>`
          : esc(place)}
        › ${esc(s.name)}
      </nav>

      <article class="winkel-card" itemscope itemtype="https://schema.org/LocalBusiness">
        <header class="winkel-header">
          <span class="winkel-emoji" aria-hidden="true">${s.emoji}</span>
          <div class="winkel-header-text">
            <h1 class="winkel-name" itemprop="name">${esc(s.name)}</h1>
            <p class="winkel-type">${TYPE_LABEL[s.type] ?? s.type} · ${esc(place)}</p>
          </div>
        </header>

        <div class="winkel-body">
          ${s.googleRating ? `
          <div class="winkel-rating">
            <span class="winkel-stars">⭐ ${s.googleRating.toFixed(1)}</span>
            ${s.googleReviews ? `<span class="winkel-reviews">${s.googleReviews} beoordelingen</span>` : ''}
          </div>` : ''}

          ${s.desc ? `<p class="winkel-desc" itemprop="description">${esc(s.desc)}</p>` : ''}

          <p class="winkel-context">${contextParagraph(s, place, prov)}</p>

          <dl class="winkel-details">
            <div class="winkel-detail">
              <dt>Adres</dt>
              <dd itemprop="address">${esc(s.address)}</dd>
            </div>
            ${s.hours ? `
            <div class="winkel-detail">
              <dt>Openingstijden</dt>
              <dd>${esc(s.hours)}</dd>
            </div>` : ''}
            ${s.products?.length ? `
            <div class="winkel-detail">
              <dt>Producten</dt>
              <dd>${esc(s.products.join(', '))}</dd>
            </div>` : ''}
          </dl>

          <div class="winkel-actions">
            <a href="${mapsUrl}" class="btn btn-green" target="_blank" rel="noopener">
              📍 Routebeschrijving (Google Maps)
            </a>
            <a href="/?route=${s.id}" class="btn btn-ghost">
              🚴 Voeg toe aan fietsroute
            </a>
          </div>
        </div>
      </article>

      ${nearbyHtml}

      <nav class="regio-more" aria-label="Meer in de regio">
        <h2 class="regio-more-title">Meer boerderijwinkels</h2>
        <div class="regio-links">
          ${byPlace[place]?.length >= 3
            ? `<a href="/gemeente/${placeSlug}" class="regio-link">Alle winkels in ${esc(place)}</a>`
            : ''}
          <a href="/regio/${provSlug}" class="regio-link">Alle winkels in ${esc(prov)}</a>
          <a href="/aanmelden" class="regio-link">Winkel aanmelden</a>
        </div>
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
      <a href="/blog/">Verhalen</a>
    </div>
  </footer>
</body>
</html>`;

  writeFileSync(join(root, `public/winkel/${slug}.html`), html, 'utf8');
  count++;
}

console.log(`✓ ${count} winkelpagina's gegenereerd in public/winkel/`);
