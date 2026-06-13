/* Genereert categorie × provincie-landingspagina's voor long-tail zoekintentie:
   /eierautomaten/gelderland, /melktap/noord-brabant, /zelfpluktuinen/utrecht, ...
   Eén pagina per combinatie met minimaal MIN_COMBO locaties. */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getProvince, placeOf, provSlug } from './place-prov.mjs';
import { shopSlug, hasWinkelPage } from './shop-url.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');
const shops = JSON.parse(readFileSync(join(root, 'src/data/verifiedShops.json'), 'utf8'));

const SITE = 'https://www.boerenroute.nl';
const MIN_COMBO = 3; // gelijk houden met MIN_COMBO in gen-categorie.mjs

const TYPE_LABEL = {
  winkel: 'Boerderijwinkel', automaat: 'Versautomaat',
  zelfpluk: 'Zelfpluktuin', markt: 'Boerenmarkt', onderweg: 'Uitje',
};

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function slugify(s) {
  return 'plaats-' + String(s ?? '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/* ── Categorie-definities (filters & FAQ identiek aan gen-categorie.mjs) ─────── */
const eierFilter = s =>
  (s.tags || []).includes('eieren') || (s.products || []).some(p => /ei(eren?)?/i.test(p));
const melktapFilter = s =>
  (s.products || []).some(p => /\bmelk(tap)?\b|rauwe melk|verse melk/i.test(p)) || /melktap/i.test(s.name);

const CATEGORIES = [
  {
    slug: 'versautomaten', noun: 'Versautomaten', lower: 'versautomaten', emoji: '🥛',
    filter: s => s.type === 'automaat',
    intro: (prov, n) => `Een <strong>versautomaat</strong> is een automaat op een boerderij of langs de weg waar je 24 uur per dag verse producten koopt: melk, eieren, kaas, vlees of groente. In <strong>${prov}</strong> hebben we <strong>${n} versautomaten</strong> in kaart gebracht.`,
    faq: [
      { q: 'Wat verkoopt een versautomaat?', a: 'De meeste versautomaten bieden verse melk, eieren, kaas, yoghurt of vlees aan. Sommige automaten hebben ook seizoensgroente of fruit. Het aanbod verschilt per boerderij.' },
      { q: 'Zijn versautomaten 24 uur open?', a: 'De meeste versautomaten zijn 24/7 toegankelijk, ook op zondag en feestdagen. Controleer altijd even de openingstijden bij de specifieke locatie.' },
    ],
  },
  {
    slug: 'eierautomaten', noun: 'Eierautomaten', lower: 'eierautomaten', emoji: '🥚',
    filter: eierFilter,
    intro: (prov, n) => `Een <strong>eierautomaat</strong> is een automaat bij een kippenboer waar je raak-verse eieren koopt van scharrel- of vrije-uitloopkippen. In <strong>${prov}</strong> vind je <strong>${n} locaties</strong> met verse eieren.`,
    faq: [
      { q: 'Wat is een eierautomaat?', a: 'Een eierautomaat is een zelfbedieningsautomaat bij een boerderij. Je koopt er verse eieren van eigen kippen, vaak scharrel of biologisch. Betalen gaat met muntgeld of pin, afhankelijk van de locatie.' },
      { q: 'Zijn eieren uit een automaat verser dan in de supermarkt?', a: 'Ja, doorgaans wel. De eieren worden rechtstreeks van de boer verkocht, zonder distributiecentrum. Dat kan betekenen dat ze soms nog maar 1-2 dagen oud zijn.' },
    ],
  },
  {
    slug: 'zelfpluktuinen', noun: 'Zelfpluktuinen', lower: 'zelfpluktuinen', emoji: '🍓',
    filter: s => s.type === 'zelfpluk',
    intro: (prov, n) => `In een <strong>zelfpluktuin</strong> pluk je zelf vers van het land: aardbeien, frambozen, bloemen en meer. Een leuk dagje uit met kinderen. In <strong>${prov}</strong> hebben we <strong>${n} zelfpluktuinen</strong> in kaart gebracht.`,
    faq: [
      { q: 'Wat is een zelfpluktuin?', a: 'Een zelfpluktuin (ook wel u-pluktuin of pick-your-own) is een perceel bij een boerderij of tuinder waar je zelf fruit, groente of bloemen plukt. Je betaalt per gewicht of per emmer.' },
      { q: 'Wanneer is een zelfpluktuin open?', a: 'Zelfpluktuinen zijn seizoensgebonden: aardbeien van mei tot juli, bloemen in de zomer, appels en peren in het najaar. Controleer altijd de website van de locatie.' },
    ],
  },
  {
    slug: 'melktap', noun: 'Melktappen', lower: 'melktappen', emoji: '🥛',
    filter: melktapFilter,
    intro: (prov, n) => `Bij een <strong>melktap</strong> koop je verse, ongepasteuriseerde melk rechtstreeks van de boerderij — vul je eigen fles of koop er een ter plekke. In <strong>${prov}</strong> hebben we <strong>${n} locaties</strong> met verse melk in kaart.`,
    faq: [
      { q: 'Wat is een melktap?', a: 'Een melktap is een koelinstallatie bij een boerderij waar je zelf verse, ongepasteuriseerde (rauwe) koemelk tapt. Je betaalt per liter, vaak met muntgeld. Sommige tappen accepteren ook pin.' },
      { q: 'Is rauwe melk veilig?', a: 'Verse rauwe melk van een hygiënisch bedrijf is voor de meeste gezonde mensen prima te drinken. De NVWA raadt risicogroepen aan om het te verhitten. Kook de melk thuis kort op als je twijfelt.' },
    ],
  },
  {
    slug: 'streekproducten', noun: 'Boerderijwinkels met streekproducten', lower: 'boerderijwinkels', emoji: '🧺',
    filter: s => s.type === 'winkel',
    intro: (prov, n) => `<strong>Streekproducten</strong> komen uit een specifiek gebied: lokale kaas, ambachtelijk vlees, honing, groente en fruit — rechtstreeks van de producent. In <strong>${prov}</strong> vind je <strong>${n} boerderijwinkels</strong> met streekproducten.`,
    faq: [
      { q: 'Wat zijn streekproducten?', a: 'Streekproducten zijn voedselproducten die verbonden zijn aan een specifiek gebied, gemaakt met lokale ingrediënten en ambachtelijke kennis die van generatie op generatie wordt doorgegeven.' },
      { q: 'Wat is het voordeel van streekproducten?', a: 'Ze zijn verser (kortere keten), ondersteunen lokale boeren, zijn vaak ambachtelijker gemaakt en hebben door minder transport een lagere CO₂-voetafdruk.' },
    ],
  },
];

/* ── Per categorie: filter + groepeer per provincie ─────────────────────────── */
for (const cat of CATEGORIES) {
  const list = shops.filter(s => s.type !== 'onderweg' && cat.filter(s));
  const byProv = {};
  for (const s of list) {
    const prov = getProvince(s);
    if (!prov || prov === 'Overig') continue;
    (byProv[prov] ||= []).push(s);
  }
  cat._byProv = byProv;
  cat._provs = new Set(Object.entries(byProv).filter(([, l]) => l.length >= MIN_COMBO).map(([p]) => p));
}

function shopCard(s) {
  const inner = `
        <span class="regio-emoji" aria-hidden="true">${s.emoji}</span>
        <div class="regio-info">
          <h3 class="regio-shop-name">${esc(s.name)}</h3>
          <p class="regio-shop-type">${TYPE_LABEL[s.type] ?? s.type} · ${esc(s.address)}</p>
          ${s.products?.length ? `<p class="regio-shop-products">${esc(s.products.slice(0, 6).join(', '))}</p>` : ''}
          ${s.hours ? `<p class="regio-shop-hours">🕐 ${esc(s.hours)}</p>` : ''}
          ${s.googleRating ? `<p class="regio-shop-rating">⭐ ${s.googleRating.toFixed(1)}${s.googleReviews ? ` (${s.googleReviews})` : ''}</p>` : ''}
        </div>`;
  // Link naar de winkeldetailpagina als die bestaat → interne links + crawlbaarheid
  return hasWinkelPage(s)
    ? `<a class="regio-shop regio-shop-link" href="/winkel/${shopSlug(s)}">${inner}</a>`
    : `<article class="regio-shop">${inner}</article>`;
}

function pageHtml(cat, prov, plist) {
  const pslug = provSlug(prov);
  const count = plist.length;
  const title = `${cat.noun} in ${prov}`;
  const url = `${SITE}/${cat.slug}/${pslug}`;

  /* Groepeer per gemeente → lokale long-tail + nette kop-hiërarchie */
  const byPlace = {};
  for (const s of plist) (byPlace[placeOf(s) || 'Overig'] ||= []).push(s);
  const placeGroups = Object.entries(byPlace)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'nl'));

  const sections = placeGroups.map(([place, list]) => `
      <section class="regio-place" id="${slugify(place)}">
        <h2 class="regio-place-title">${cat.noun} in ${esc(place)} <span class="regio-place-count">${list.length}</span></h2>
        <div class="regio-shops">${list.map(shopCard).join('')}</div>
      </section>`).join('');

  const placeNav = placeGroups.filter(([, l]) => l.length >= 3);
  const navHtml = placeNav.length > 1
    ? `<nav class="regio-placenav" aria-label="Spring naar plaats">
        <span class="regio-placenav-label">Plaatsen:</span>${placeNav
        .map(([p, l]) => `<a href="#${slugify(p)}">${esc(p)} <span>${l.length}</span></a>`).join('')}</nav>`
    : '';

  /* Kruislinks: dezelfde categorie in andere provincies */
  const otherProvs = [...cat._provs].filter(p => p !== prov).sort((a, b) => a.localeCompare(b, 'nl'));
  const otherProvHtml = otherProvs.length
    ? `<nav class="regio-more" aria-label="${esc(cat.noun)} in andere provincies">
        <h2 class="regio-more-title">${cat.emoji} ${esc(cat.noun)} in andere provincies</h2>
        <div class="regio-links">${otherProvs
          .map(p => `<a href="/${cat.slug}/${provSlug(p)}" class="regio-link">${esc(p)} <span class="regio-link-count">(${cat._byProv[p].length})</span></a>`).join('')}</div>
      </nav>`
    : '';

  /* Kruislinks: andere categorieën in dezelfde provincie */
  const otherCats = CATEGORIES.filter(c => c.slug !== cat.slug && c._provs.has(prov));
  const otherCatHtml = otherCats.length
    ? `<nav class="regio-more" aria-label="Andere soorten in ${esc(prov)}">
        <h2 class="regio-more-title">Meer verse adresjes in ${esc(prov)}</h2>
        <div class="regio-links">${otherCats
          .map(c => `<a href="/${c.slug}/${pslug}" class="regio-link">${c.emoji} ${esc(c.noun)} <span class="regio-link-count">(${c._byProv[prov].length})</span></a>`).join('')}
          <a href="/regio/${pslug}" class="regio-link">🗺️ Alle locaties in ${esc(prov)}</a>
        </div>
      </nav>`
    : `<nav class="regio-more"><div class="regio-links"><a href="/regio/${pslug}" class="regio-link">🗺️ Alle locaties in ${esc(prov)}</a></div></nav>`;

  const metaDesc = `Vind ${count} ${cat.lower} in ${prov}. Verse producten rechtstreeks van de boer — bekijk adressen, openingstijden en beoordelingen op Boerenroute.nl.`;

  const itemListSchema = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: title, numberOfItems: count, url,
    itemListElement: plist.slice(0, 50).map((s, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': 'LocalBusiness', name: s.name, address: s.address,
        geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng },
      },
    })),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Boerenroute.nl', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: cat.noun, item: `${SITE}/${cat.slug}` },
      { '@type': 'ListItem', position: 3, name: title, item: url },
    ],
  };
  const faqSchema = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: cat.faq.map(({ q, a }) => ({
      '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
  const faqHtml = `
      <section class="categ-faq">
        <h2>Veelgestelde vragen</h2>
        ${cat.faq.map(({ q, a }) => `
        <details class="faq-item">
          <summary>${esc(q)}</summary>
          <p>${a}</p>
        </details>`).join('')}
      </section>`;

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — Boerenroute.nl</title>
  <meta name="description" content="${esc(metaDesc)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)} — Boerenroute.nl">
  <meta property="og:description" content="${esc(metaDesc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/public/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)} — Boerenroute.nl">
  <meta name="twitter:description" content="${esc(metaDesc)}">
  <meta name="twitter:image" content="${SITE}/public/og-image.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../styles/main.css">
  <script type="application/ld+json">${JSON.stringify(itemListSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
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
        <a href="/">Boerenroute.nl</a> › <a href="/${cat.slug}">${esc(cat.noun)}</a> › ${esc(prov)}
      </nav>

      <h1 class="regio-title">${cat.emoji} ${esc(title)}</h1>
      <p class="regio-intro">${cat.intro(prov, count)} <a href="/">Bekijk ze op de kaart →</a></p>

      ${navHtml}
      ${sections}

      ${faqHtml}

      <div class="regio-cta">
        <a href="/" class="btn btn-green">🗺️ Bekijk alle locaties op de kaart</a>
        <a href="/aanmelden" class="btn btn-ghost">🌾 Sta jij er nog niet op? Meld je aan</a>
      </div>

      ${otherCatHtml}
      ${otherProvHtml}

      <nav class="regio-more" aria-label="Meer categorieën">
        <p class="regio-more-blog"><a href="/${cat.slug}">← Alle ${esc(cat.lower)} in Nederland</a> · <a href="/blog/">📖 Verhalen &amp; seizoenstips →</a></p>
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
      <a href="/privacy">Privacy</a>
    </div>
  </footer>
</body>
</html>`;
}

/* ── Schrijf alle pagina's ──────────────────────────────────────────────────── */
let written = 0;
for (const cat of CATEGORIES) {
  mkdirSync(join(root, 'public', cat.slug), { recursive: true });
  const eligible = Object.entries(cat._byProv)
    .filter(([, l]) => l.length >= MIN_COMBO)
    .sort((a, b) => b[1].length - a[1].length);
  for (const [prov, plist] of eligible) {
    writeFileSync(join(root, 'public', cat.slug, `${provSlug(prov)}.html`), pageHtml(cat, prov, plist), 'utf8');
    written++;
    console.log(`✓ /${cat.slug}/${provSlug(prov)} — ${plist.length} locaties`);
  }
}
console.log(`\nKlaar — ${written} categorie×provincie-pagina's.`);
