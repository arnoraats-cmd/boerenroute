/* Genereert statische categoriepagina's voor hoog-volume zoekwoorden:
   /versautomaten, /eierautomaten, /zelfpluktuinen, /melktap, /streekproducten */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getProvince, provSlug } from './place-prov.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

const shops = JSON.parse(readFileSync(join(root, 'src/data/verifiedShops.json'), 'utf8'));

const SITE = 'https://www.boerenroute.nl';

const TYPE_LABEL = {
  winkel: 'Boerderijwinkel', automaat: 'Versautomaat',
  zelfpluk: 'Zelfpluktuin', markt: 'Boerenmarkt', onderweg: 'Uitje',
};

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function slugify(s) {
  return 'plaats-' + String(s ?? '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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

/* Drempel: minimaal aantal locaties per categorie+provincie voor een eigen pagina.
   Moet gelijk zijn aan MIN_COMBO in gen-categorie-regio.mjs. */
const MIN_COMBO = 3;

function provSection(prov, list, catSlug) {
  const slug = provSlug(prov);
  const cards = list.map(shopCard).join('');
  // Link naar de categorie×provincie-pagina als die bestaat (≥ MIN_COMBO locaties)
  const subLink = (catSlug && list.length >= MIN_COMBO)
    ? `<p class="categ-prov-link"><a href="/${catSlug}/${slug}">Bekijk alles in ${esc(prov)} →</a></p>`
    : '';
  return `
    <section class="categ-prov" id="prov-${slug}">
      <h2 class="regio-place-title">${esc(prov)} <span class="regio-place-count">${list.length}</span></h2>
      ${subLink}
      <div class="regio-shops">${cards}</div>
    </section>`;
}

function pageHtml({ slug, title, metaDesc, h1, intro, list, faq = null }) {
  const provGroups = groupByProv(list);
  const count = list.length;

  const provNav = provGroups.length > 2
    ? `<nav class="regio-placenav" aria-label="Spring naar provincie">
        <span class="regio-placenav-label">Provincies:</span>${provGroups
          .map(([p, l]) => {
            const ps = provSlug(p);
            return `<a href="#prov-${ps}">${esc(p)} <span>${l.length}</span></a>`;
          }).join('')}</nav>`
    : '';

  const sections = provGroups.map(([p, l]) => provSection(p, l, slug)).join('');

  const faqHtml = faq?.length ? `
    <section class="categ-faq">
      <h2>Veelgestelde vragen</h2>
      ${faq.map(({q, a}) => `
      <details class="faq-item">
        <summary>${esc(q)}</summary>
        <p>${a}</p>
      </details>`).join('')}
    </section>` : '';

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
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)} — Boerenroute.nl">
  <meta property="og:description" content="${esc(metaDesc)}">
  <meta property="og:url" content="${SITE}/${slug}">
  <meta property="og:image" content="${SITE}/public/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)} — Boerenroute.nl">
  <meta name="twitter:description" content="${esc(metaDesc)}">
  <meta name="twitter:image" content="${SITE}/public/og-image.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles/main.css">
  <script type="application/ld+json">${JSON.stringify(itemListSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  ${faqSchema ? `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>` : ''}
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
      <p class="regio-intro">${intro}</p>

      ${provNav}
      ${sections}

      ${faqHtml}

      <div class="regio-cta">
        <a href="/" class="btn btn-green">🗺️ Bekijk alle locaties op de kaart</a>
        <a href="/aanmelden" class="btn btn-ghost">🌾 Winkel aanmelden</a>
      </div>

      <nav class="regio-more" aria-label="Meer categorieën">
        <h2 class="regio-more-title">Meer soorten verkooppunten</h2>
        <div class="regio-links">
          <a href="/versautomaten" class="regio-link">🥛 Versautomaten</a>
          <a href="/eierautomaten" class="regio-link">🥚 Eierautomaten</a>
          <a href="/zelfpluktuinen" class="regio-link">🍓 Zelfpluktuinen</a>
          <a href="/melktap" class="regio-link">🥛 Melktap</a>
          <a href="/streekproducten" class="regio-link">🧺 Streekproducten</a>
        </div>
        <h2 class="regio-more-title" style="margin-top:1.5rem">Seizoensroutes op de fiets</h2>
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
}

mkdirSync(join(root, 'public'), { recursive: true });

/* ── 1. Versautomaten ─────────────────────────────────────────────────────── */
const automaten = shops.filter(s => s.type === 'automaat');
writeFileSync(join(root, 'public/versautomaten.html'), pageHtml({
  slug: 'versautomaten',
  title: 'Versautomaten in Nederland',
  metaDesc: `Vind ${automaten.length} versautomaten bij jou in de buurt. Verse melk, eieren, kaas en groente rechtstreeks van de boer, 24/7 bereikbaar.`,
  h1: `Versautomaten — ${automaten.length} adressen in heel Nederland`,
  intro: `Een <strong>versautomaat</strong> is een automaat op een boerderij of langs de weg waar je 24 uur per dag verse producten kunt kopen: melk, eieren, kaas, vlees, groente of fruit. Wij hebben <strong>${automaten.length} versautomaten</strong> in kaart gebracht. <a href="/">Bekijk ze op de kaart →</a>`,
  list: automaten,
  faq: [
    { q: 'Wat verkoopt een versautomaat?', a: 'De meeste versautomaten bieden verse melk, eieren, kaas, yoghurt of vlees aan. Sommige automaten hebben ook seizoensgroente of fruit. Het aanbod verschilt per boerderij.' },
    { q: 'Zijn versautomaten 24 uur open?', a: 'De meeste versautomaten zijn inderdaad 24/7 toegankelijk, ook op zondag en feestdagen. Controleer altijd even de openingstijden bij de specifieke locatie.' },
    { q: 'Hoe vind ik een versautomaat bij mij in de buurt?', a: 'Op Boerenroute.nl kun je filteren op "automaat" en je locatie invoeren. De kaart toont direct alle versautomaten in je omgeving, gesorteerd op afstand.' },
  ],
}), 'utf8');
console.log(`✓ versautomaten.html — ${automaten.length} locaties`);

/* ── 2. Eierautomaten ─────────────────────────────────────────────────────── */
const eierShops = shops.filter(s =>
  (s.tags||[]).includes('eieren') ||
  (s.products||[]).some(p => /ei(eren?)?/i.test(p))
);
writeFileSync(join(root, 'public/eierautomaten.html'), pageHtml({
  slug: 'eierautomaten',
  title: 'Eierautomaten in Nederland',
  metaDesc: `Vind ${eierShops.length} eierautomaten bij jou in de buurt. Verse scharrel- en vrije-uitloopeieren rechtstreeks van de boer, 24/7 beschikbaar.`,
  h1: `Eierautomaten — ${eierShops.length} adressen in heel Nederland`,
  intro: `Een <strong>eierautomaat</strong> is een automaat bij een kippenboer of boerderij waar je verse eieren kunt kopen. De eieren zijn raak-vers, afkomstig van scharrelkippen of vrije-uitloopdieren — geen tussenpersoon, geen supermarkt. We hebben <strong>${eierShops.length} locaties</strong> met verse eieren in kaart gebracht. <a href="/">Zoek bij jou in de buurt →</a>`,
  list: eierShops,
  faq: [
    { q: 'Wat is een eierautomaat?', a: 'Een eierautomaat is een zelfbedieningsautomaat bij een boerderij. Je koopt er verse eieren van eigen kippen, vaak scharrel- of biologisch. Betalen gaat met muntgeld of pin, afhankelijk van de locatie.' },
    { q: 'Zijn eieren uit een automaat verser dan in de supermarkt?', a: 'Ja, doorgaans wel. De eieren worden rechtstreeks van de boer verkocht, zonder distributiecentrum. Dat kan betekenen dat ze soms nog maar 1-2 dagen oud zijn.' },
    { q: 'Hoe betaal ik bij een eierautomaat?', a: 'Dat verschilt per automaat. Veel automaten accepteren munten en/of bankpassen. Sommige werken alleen met contant geld. Neem bij twijfel wat munten mee.' },
  ],
}), 'utf8');
console.log(`✓ eierautomaten.html — ${eierShops.length} locaties`);

/* ── 3. Zelfpluktuinen ────────────────────────────────────────────────────── */
const zelfpluk = shops.filter(s => s.type === 'zelfpluk');
writeFileSync(join(root, 'public/zelfpluktuinen.html'), pageHtml({
  slug: 'zelfpluktuinen',
  title: 'Zelfpluktuinen in Nederland',
  metaDesc: `Ontdek ${zelfpluk.length} zelfpluktuinen in Nederland. Pluk zelf aardbeien, bloemen, groente of fruit rechtstreeks van het land.`,
  h1: `Zelfpluktuinen — ${zelfpluk.length} adressen in heel Nederland`,
  intro: `In een <strong>zelfpluktuin</strong> pluk je zelf vers van het land: aardbeien, frambozen, tomaten, sperziebonen, bloemen en meer. Een dag erop uit met kinderen, en je neemt verse producten mee naar huis. Wij hebben <strong>${zelfpluk.length} zelfpluktuinen</strong> in kaart gebracht. <a href="/">Bekijk ze op de kaart →</a>`,
  list: zelfpluk,
  faq: [
    { q: 'Wat is een zelfpluktuin?', a: 'Een zelfpluktuin (ook wel u-pluktuin of pick-your-own) is een perceel bij een boerderij of tuinder waar je zelf fruit, groente of bloemen kunt plukken. Je betaalt per gewicht of per emmer.' },
    { q: 'Wanneer is een zelfpluktuin open?', a: 'Zelfpluktuinen zijn seizoensgebonden: aardbeien van mei tot juli, bloemen in de zomer, appels en peren in het najaar. De meeste tuinen zijn van dinsdag t/m zondag open; controleer altijd de website van de locatie.' },
    { q: 'Wat moet ik meenemen naar een zelfpluktuin?', a: 'Neem stevige schoenen mee (gras kan glibberig zijn), eventueel een extra emmer, en contant geld. De meeste tuinen bieden wel mandjes ter plekke aan.' },
  ],
}), 'utf8');
console.log(`✓ zelfpluktuinen.html — ${zelfpluk.length} locaties`);

/* ── 4. Melktap ───────────────────────────────────────────────────────────── */
const melktap = shops.filter(s =>
  (s.products||[]).some(p => /\bmelk(tap)?\b|rauwe melk|verse melk/i.test(p)) ||
  /melktap/i.test(s.name)
);
writeFileSync(join(root, 'public/melktap.html'), pageHtml({
  slug: 'melktap',
  title: 'Melktap — verse rauwe melk van de boer',
  metaDesc: `Vind ${melktap.length} melktappen in Nederland. Koop verse, ongepasteuriseerde melk rechtstreeks van de boerderij.`,
  h1: `Melktap — ${melktap.length} locaties met verse melk`,
  intro: `Bij een <strong>melktap</strong> koop je verse, ongepasteuriseerde melk rechtstreeks van de boerderij. Vul je eigen fles of koop een fles ter plekke. De melk is onbehandeld, vol van smaak en komt van koeien die je soms zelfs kunt zien. Wij hebben <strong>${melktap.length} locaties</strong> met verse melk in kaart. <a href="/">Zoek bij jou in de buurt →</a>`,
  list: melktap,
  faq: [
    { q: 'Wat is een melktap?', a: 'Een melktap is een koelinstallatie bij een boerderij waar je zelf verse, ongepasteuriseerde (rauwe) koemelk uit kunt tappen. Je betaalt per liter, vaak met muntgeld. Sommige tappen accepteren ook pin.' },
    { q: 'Is rauwe melk veilig?', a: 'Verse rauwe melk van een hygiënisch bedrijf is voor de meeste gezonde mensen prima te drinken. De NVWA raadt risicogroepen (zwangere vrouwen, kleine kinderen, ouderen, mensen met lage weerstand) aan om het te verhitten. Kook de melk thuis kort op als je twijfelt.' },
    { q: 'Hoelang is verse melk houdbaar?', a: 'Verse, ongepasteuriseerde melk is in de koelkast 2-4 dagen houdbaar. Koop dus niet meer dan je in een paar dagen opmaakt.' },
  ],
}), 'utf8');
console.log(`✓ melktap.html — ${melktap.length} locaties`);

/* ── 5. Streekproducten ───────────────────────────────────────────────────── */
const streek = shops.filter(s => s.type === 'winkel');
writeFileSync(join(root, 'public/streekproducten.html'), pageHtml({
  slug: 'streekproducten',
  title: 'Streekproducten kopen in Nederland',
  metaDesc: `Ontdek ${streek.length} boerderijwinkels met streekproducten bij jou in de buurt. Lokale kaas, vlees, groente en meer — rechtstreeks van de boer.`,
  h1: `Streekproducten kopen — ${streek.length} boerderijwinkels in heel Nederland`,
  intro: `<strong>Streekproducten</strong> zijn producten die gemaakt worden in een specifiek gebied, met lokale ingrediënten en ambachtelijke methodes. Op Boerenroute.nl vind je <strong>${streek.length} boerderijwinkels</strong> met streekproducten: lokale kaas, ambachtelijk vlees, verse eieren, honing, groente en fruit — rechtstreeks van de producent. <a href="/">Zoek bij jou in de buurt →</a>`,
  list: streek,
  faq: [
    { q: 'Wat zijn streekproducten?', a: 'Streekproducten zijn voedselproducten die verbonden zijn aan een specifiek gebied. Denk aan Goudse kaas, Zeeuwse mosselen, Drentse rogge of Limburgse vlaai. Ze zijn gemaakt met lokale ingrediënten en kennis die van generatie op generatie wordt doorgegeven.' },
    { q: 'Waar kan ik streekproducten kopen?', a: 'Op Boerenroute.nl vind je honderden boerderijwinkels, boerenmarkten en versautomaten met lokale streekproducten. Vul je postcode in en ontdek wat er bij jou in de buurt te koop is.' },
    { q: 'Wat is het voordeel van streekproducten?', a: 'Streekproducten zijn verser (kortere keten), ondersteunen lokale boeren, zijn vaak ambachtelijker gemaakt, en hebben een lagere CO₂-voetafdruk door minder transport. Bovendien smaken ze door de kortere bewaarperiode vaak beter.' },
  ],
}), 'utf8');
console.log(`✓ streekproducten.html — ${streek.length} locaties`);

console.log('\nKlaar.');
