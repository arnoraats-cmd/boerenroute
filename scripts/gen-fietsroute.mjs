/* Genereert thematische SEO-landingspagina's voor seizoenszoekwoorden:
   /fietsroute-asperges, /fietsroute-aardbeien,
   /kaasboerderij-bezoeken, /boerderijijs-nederland */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getProvince, PROV_SLUG } from './place-prov.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

const shops = JSON.parse(readFileSync(join(root, 'src/data/verifiedShops.json'), 'utf8'));
const SITE  = 'https://www.boerenroute.nl';

const TYPE_LABEL = {
  winkel: 'Boerderijwinkel', automaat: 'Versautomaat',
  zelfpluk: 'Zelfpluktuin', markt: 'Boerenmarkt', onderweg: 'Uitje',
  streekwinkel: 'Streekwinkel',
};

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function shopCard(s) {
  return `
      <article class="regio-shop">
        <span class="regio-emoji" aria-hidden="true">${s.emoji}</span>
        <div class="regio-info">
          <h3 class="regio-shop-name">${esc(s.name)}</h3>
          <p class="regio-shop-type">${TYPE_LABEL[s.type] ?? s.type} · ${esc(s.address)}</p>
          ${s.products?.length ? `<p class="regio-shop-products">${esc(s.products.slice(0,6).join(', '))}</p>` : ''}
          ${s.hours ? `<p class="regio-shop-hours">🕐 ${esc(s.hours)}</p>` : ''}
          ${s.googleRating ? `<p class="regio-shop-rating">⭐ ${s.googleRating.toFixed(1)}${s.googleReviews ? ` (${s.googleReviews})` : ''}</p>` : ''}
        </div>
      </article>`;
}

function groupByProv(list) {
  const byProv = {};
  for (const s of list) {
    const prov = getProvince(s);
    (byProv[prov] ||= []).push(s);
  }
  return Object.entries(byProv)
    .filter(([p]) => p !== 'Overig')
    .sort((a, b) => b[1].length - a[1].length);
}

function provSection(prov, list) {
  const slug = PROV_SLUG[prov] ?? prov.toLowerCase().replace(/[^a-z]/g, '-');
  return `
    <section class="categ-prov" id="prov-${slug}">
      <h2 class="regio-place-title">${esc(prov)} <span class="regio-place-count">${list.length}</span></h2>
      <div class="regio-shops">${list.map(shopCard).join('')}</div>
    </section>`;
}

function buildPage({ slug, title, metaDesc, h1, intro, seizoen, list, faq }) {
  const provGroups = groupByProv(list);
  const count = list.length;

  const provNav = provGroups.length > 2
    ? `<nav class="regio-placenav" aria-label="Spring naar provincie">
        <span class="regio-placenav-label">Provincies:</span>${provGroups
          .map(([p, l]) => {
            const ps = PROV_SLUG[p] ?? p.toLowerCase().replace(/[^a-z]/g, '-');
            return `<a href="#prov-${ps}">${esc(p)} <span>${l.length}</span></a>`;
          }).join('')}</nav>`
    : '';

  const sections = provGroups.map(([p, l]) => provSection(p, l)).join('');

  const faqHtml = faq?.length ? `
    <section class="categ-faq">
      <h2>Veelgestelde vragen</h2>
      ${faq.map(({q, a}) => `
      <details class="faq-item">
        <summary>${esc(q)}</summary>
        <p>${a}</p>
      </details>`).join('')}
    </section>` : '';

  const seizoenBadge = seizoen
    ? `<p class="categ-seizoen">🌿 Seizoen: <strong>${esc(seizoen)}</strong></p>`
    : '';

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    numberOfItems: count,
    url: `${SITE}/${slug}`,
    itemListElement: list.slice(0, 50).map((s, i) => ({
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
      { '@type': 'ListItem', position: 2, name: title, item: `${SITE}/${slug}` },
    ],
  };

  const faqSchema = faq?.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({q, a}) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  } : null;

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — Boerenroute.nl</title>
  <meta name="description" content="${esc(metaDesc)}">
  <link rel="canonical" href="${SITE}/${slug}">
  <meta name="robots" content="index, follow">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)} — Boerenroute.nl">
  <meta property="og:description" content="${esc(metaDesc)}">
  <meta property="og:url" content="${SITE}/${slug}">
  <meta property="og:image" content="${SITE}/public/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)} — Boerenroute.nl">
  <meta name="twitter:description" content="${esc(metaDesc)}">
  <meta name="twitter:image" content="${SITE}/public/og-image.png">
  <link rel="icon" href="/public/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles/main.css">
  <script type="application/ld+json">${JSON.stringify(itemListSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  ${faqSchema ? `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>` : ''}
  <script data-goatcounter="https://boerenroute.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
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
        <a href="/">Boerenroute.nl</a> › ${esc(title)}
      </nav>

      <h1 class="regio-title">${esc(h1)}</h1>
      ${seizoenBadge}
      <p class="regio-intro">${intro}</p>

      <div class="regio-cta regio-cta-top">
        <a href="/?filter=${encodeURIComponent(slug)}" class="btn btn-green">🗺️ Bekijk op de kaart</a>
        <span class="regio-count-label"><strong>${count}</strong> locaties gevonden</span>
      </div>

      ${provNav}
      ${sections}

      ${faqHtml}

      <div class="regio-cta">
        <a href="/" class="btn btn-green">🗺️ Bekijk alle locaties op de kaart</a>
        <a href="/aanmelden" class="btn btn-ghost">🌾 Winkel aanmelden</a>
      </div>

      <nav class="regio-more" aria-label="Meer categorieën">
        <h2 class="regio-more-title">Meer seizoensroutes</h2>
        <div class="regio-links">
          <a href="/fietsroute-asperges" class="regio-link">🌿 Fietsroute asperges</a>
          <a href="/fietsroute-aardbeien" class="regio-link">🍓 Fietsroute aardbeien</a>
          <a href="/kaasboerderij-bezoeken" class="regio-link">🧀 Kaasboerderij bezoeken</a>
          <a href="/boerderijijs-nederland" class="regio-link">🍦 Boerderij-ijs</a>
        </div>
        <p class="regio-more-blog"><a href="/blog/">📖 Lees ook: verhalen &amp; seizoenstips →</a></p>
      </nav>

    </div>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <a href="/" class="footer-logo" aria-label="Boerenroute home">
          <svg class="logo-mark" width="22" height="26" viewBox="0 0 26 30" fill="none" aria-hidden="true"><path d="M13 1.4C6.5 1.4 1.4 6.4 1.4 12.5c0 6.7 8.3 14.6 11 16.9.35.3.85.3 1.2 0 2.7-2.3 11-10.2 11-16.9C24.6 6.4 19.5 1.4 13 1.4Z" fill="#FBEFD6" stroke="#356611" stroke-width="1.7"/><path d="M13 19V9.2" stroke="#356611" stroke-width="1.7" stroke-linecap="round"/><path d="M13 14.2C9.9 14.4 7.4 12.3 7 9.4c3.1-.2 5.6 1.9 6 4.8Z" fill="#5E9420"/><path d="M13 11.4c2.6.1 4.8-1.7 5.2-4.3-2.6-.1-4.8 1.7-5.2 4.3Z" fill="#E8981C"/></svg>
          <span class="footer-logo-text">Boeren<span class="lt-accent">route</span></span>
        </a>
        <p class="footer-tagline">Lokaal, vers en op de fiets.</p>
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

/* ── Pagina-definities ─────────────────────────────────── */

const PAGES = [
  {
    slug: 'fietsroute-asperges',
    title: 'Fietsroute langs aspergevelden — rechtstreeks van de boer',
    metaDesc: 'Fiets langs aspergetelers, boerderijwinkels en versautomaten met verse asperges. Kaart met 30+ locaties in heel Nederland, gratis route plannen.',
    h1: 'Fietsroute langs aspergevelden',
    seizoen: 'April – juni',
    intro: 'Aspergeseizoen loopt van half april tot 24 juni (Sint-Jan). In die korte periode liggen de velden vol met witte en groene asperges, die elke dag vers worden gestoken. Op de fiets kom je langs boerenautomaten, landwinkels en zelfpluktuinen die de asperges dezelfde dag nog verkopen — fresher than that? Impossible. Plan je route, pak een fietsmand en fiets langs het wit goud.',
    filter: s => {
      const j = JSON.stringify(s).toLowerCase();
      return j.includes('asperge');
    },
    faq: [
      {
        q: 'Wanneer is het aspergeseizoen in Nederland?',
        a: 'Het aspergeseizoen loopt van half april tot 24 juni (Sint-Jan). Op die dag eindigt de oogst traditioneel zodat de plant kan herstellen voor het volgende jaar.',
      },
      {
        q: 'Waar kan ik verse asperges rechtstreeks van de boer kopen?',
        a: 'Op Boerenroute.nl vind je meer dan 30 locaties in heel Nederland waar je verse asperges koopt bij de teler zelf — via een versautomaat (24/7 beschikbaar), een boerderijwinkel of een zelfpluktuin.',
      },
      {
        q: 'Zijn verse asperges van de boer lekkerder dan uit de supermarkt?',
        a: 'Asperges verliezen snel smaak na het steken — elke dag telt. Rechtstreeks bij de teler kopen betekent dat de asperges die ochtend of hooguit de dag ervoor gestoken zijn. Dat proef je.',
      },
      {
        q: 'Welke provincies zijn bekend om asperges?',
        a: 'Noord-Brabant (de Aspergeregio rond Venlo en de Peel), Limburg en Zeeland zijn de grootste aspergeprovincies. Maar ook in Gelderland, Overijssel en Noord-Holland zijn telers te vinden.',
      },
    ],
  },
  {
    slug: 'fietsroute-aardbeien',
    title: 'Fietsroute langs aardbeienpluk — zelfpluktuin op de fiets',
    metaDesc: 'Pak je fietsmand en pluk zelf verse aardbeien bij een boer bij jou in de buurt. Kaart met 100+ zelfpluktuinen en aardbeienboerderijen in Nederland.',
    h1: 'Fietsroute langs aardbeien plukken',
    seizoen: 'Juni – augustus',
    intro: 'Een volle mand zelfgeplukte aardbeien, warm van de zon — dat is de essentie van deze fietsroute. Aardbeienpluk is in Nederland van eind mei tot augustus mogelijk bij honderden boeren en zelfpluktuinen. Fiets er naartoe, pluk je eigen aardbei en neem de rest mee naar huis. Kinderen zijn er dol op, en de prijs per kilo ligt lager dan in de supermarkt.',
    filter: s => {
      const j = JSON.stringify(s).toLowerCase();
      return j.includes('aardbei') || s.type === 'zelfpluk';
    },
    faq: [
      {
        q: 'Wanneer kan ik aardbeien plukken in Nederland?',
        a: 'Aardbeienpluk is mogelijk van eind mei tot augustus, afhankelijk van het ras en de regio. De piek ligt in juni en juli. Check bij de teler of het seizoen al begonnen is.',
      },
      {
        q: 'Wat kost zelf aardbeien plukken bij een boer?',
        a: 'Gemiddeld betaal je €3–5 per kilo bij een zelfpluktuin — goedkoper dan de supermarkt én een stuk leuker. Je krijgt een bakje mee om te wegen, of betaalt per mand.',
      },
      {
        q: 'Mag ik ter plekke al aardbeien eten bij het plukken?',
        a: 'Dat verschilt per boer. De meeste tuinen hebben er geen bezwaar tegen als je proeft om de rijpheid te beoordelen, maar neem geen handenvol ter plekke. Check de huisregels bij het instappen.',
      },
      {
        q: 'Zijn er ook aardbeienautomaten 24/7?',
        a: 'Ja, steeds meer boeren hebben een versautomaat bij de boerderij staan met verse aardbeien — ook buiten openingstijden. Je vindt ze op de kaart op Boerenroute.nl.',
      },
    ],
  },
  {
    slug: 'kaasboerderij-bezoeken',
    title: 'Kaasboerderij bezoeken — boerenkaas rechtstreeks van de boer',
    metaDesc: 'Bezoek een kaasboerderij bij jou in de buurt en koop boerenkaas rechtstreeks van de maker. Kaart met 200+ kaasboerderijen, landwinkels en zuivelautomaten in Nederland.',
    h1: 'Kaasboerderij bezoeken in Nederland',
    seizoen: 'Het hele jaar',
    intro: 'Nederland is van oudsher een kaasland. Op Boerenroute.nl vind je kaasboerderijen, landwinkels en zuivelautomaten waar je boerenkaas, jonge kaas, belegen kaas of geitenkaas koopt bij de maker zelf. Geen supermarktsmeer, maar kaas die hier in de buurt gemaakt wordt — vaak met melk van de koeien die je nog net achter het hek ziet staan.',
    filter: s => {
      const prods = (s.products || []).map(p => p.toLowerCase());
      return prods.some(p => p.includes('kaas')) || s.name.toLowerCase().includes('kaas');
    },
    faq: [
      {
        q: 'Wat is het verschil tussen boerenkaas en fabriekkaas?',
        a: 'Boerenkaas (met het Boerenkaas-keurmerk) wordt gemaakt van rauwe melk, direct op de boerderij. Fabriekkaas wordt gemaakt van gepasteuriseerde melk in een grote fabriek. Boerenkaas heeft een rijkere, complexere smaak en is strenger gekeurd.',
      },
      {
        q: 'Kan ik een kaasboerderij zomaar bezoeken?',
        a: 'Veel kaasboerderijen hebben een winkel aan huis die je gewoon kunt bezoeken tijdens openingstijden. Je vindt de openingstijden bij elke locatie op Boerenroute.nl. Een afspraak voor een rondleiding is soms wel handig.',
      },
      {
        q: 'Welke soorten kaas vind ik bij een kaasboerderij?',
        a: 'Jonge kaas, belegen kaas, oud, graskaas (voorjaar), kruidenkaas, geitenkaas, schapenkaas en streekkazen per regio. Elk bedrijf heeft zijn eigen specialiteiten — vraag gerust naar de favorieten van de boer zelf.',
      },
      {
        q: 'In welke provincies zijn de meeste kaasboerderijen?',
        a: 'Noord- en Zuid-Holland (Gouda, Edam), Utrecht (Lopikerwaard), Friesland (Friese Nagelkaas) en Noord-Brabant hebben de meeste kaasboerderijen. Maar in vrijwel elke provincie zijn er wel een paar te vinden.',
      },
    ],
  },
  {
    slug: 'boerderijijs-nederland',
    title: 'Boerderij-ijs in Nederland — ambachtelijk ijs van de boer',
    metaDesc: 'Geniet van ambachtelijk roomijs bij een boerderij bij jou in de buurt. Kaart met 60+ boerderijwinkels en melktappen met eigen ijs in heel Nederland.',
    h1: 'Boerderij-ijs in Nederland',
    seizoen: 'April – september',
    intro: 'Ambachtelijk roomijs gemaakt van eigen melk, met echte vruchten en zonder een waslijst aan toevoegingen — dat is boerderij-ijs. Steeds meer boeren maken hun eigen ijs van de melk van hun koeien of geiten. Het resultaat smaakt romiger, puurder en eerlijker dan wat je in de supermarkt vindt. Fiets er naartoe en neem een schepje (of drie).',
    filter: s => {
      const j = JSON.stringify(s).toLowerCase();
      return (s.products || []).some(p => p.toLowerCase().includes('ijs')) ||
             j.includes('roomijs') || j.includes('boerderijijs') || j.includes('ijsboerderij');
    },
    faq: [
      {
        q: 'Wat maakt boerderij-ijs anders dan gewoon ijs?',
        a: 'Boerderij-ijs wordt gemaakt van verse melk of room van de eigen koeien, geiten of schapen — soms zelfs van melk die die ochtend gemolken is. Geen kunstmatige kleurstoffen of smaken, maar echte ingrediënten. De smaak is romiger en voller.',
      },
      {
        q: 'Wanneer kan ik boerderij-ijs kopen?',
        a: 'De meeste boerderijen verkopen ijs van april tot september. Sommige melktapautomaten hebben ook in de winter ijs verkrijgbaar. Check de openingstijden bij elke locatie op de kaart.',
      },
      {
        q: 'Is boerderij-ijs duurder dan supermarktijs?',
        a: 'Per bol betaal je iets meer (€1,50–2,50 per bol), maar de kwaliteit is niet te vergelijken. Voor een bakje (500ml) of een liter betaal je vergelijkbaar met goed ijs in de supermarkt — maar dan weet je waar het vandaan komt.',
      },
      {
        q: 'Welke smaken heeft boerderij-ijs?',
        a: 'Dat verschilt per bedrijf, maar populair zijn: vanille (van eigen melk), aardbei (eigen seizoensfruit), stracciatella, chocolade en seizoenssmaken zoals rabarber in het voorjaar of appel in de herfst.',
      },
    ],
  },
];

/* ── Genereren ─────────────────────────────────────────── */
let total = 0;

for (const page of PAGES) {
  const list = shops.filter(page.filter).filter(s => s.type !== 'onderweg');
  const dir  = join(root, 'public', page.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), buildPage({ ...page, list }), 'utf8');
  console.log(`✓ /${page.slug}  (${list.length} locaties)`);
  total++;
}

console.log(`\nKlaar — ${total} pagina's gegenereerd.`);
