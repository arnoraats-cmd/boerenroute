/* Genereert statische, indexeerbare blogpagina's in public/blog/ */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

const posts = JSON.parse(readFileSync(join(root, 'src/data/blog.json'), 'utf8'));

mkdirSync(join(root, 'public/blog'), { recursive: true });

const SITE = 'https://www.boerenroute.nl';

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function blockHTML(b) {
  if (b.type === 'h2') return `      <h2>${esc(b.text)}</h2>`;
  if (b.type === 'p')  return `      <p>${esc(b.text)}</p>`;
  if (b.type === 'ul') return `      <ul>${b.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
  return '';
}

function shell(title, desc, canonical, bodyInner, jsonLd) {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — Boerenroute.nl</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="${SITE}/public/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)} — Boerenroute.nl">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${SITE}/public/og-image.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../styles/main.css">
  ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
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

  <main class="verhalen-section">
${bodyInner}
  </main>

  <footer class="site-footer">
    <div class="footer-bottom">
      <p>© 2026 Boerenroute.nl</p>
      <a href="/blog/">Alle verhalen</a>
    </div>
  </footer>
</body>
</html>`;
}

/* ── Losse artikelen ─────────────────────────────────────────── */
for (const post of posts) {
  const canonical = `${SITE}/blog/${post.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePublished: post.date,
    author: { '@type': 'Organization', name: post.author || 'Boerenroute.nl' },
    publisher: { '@type': 'Organization', name: 'Boerenroute.nl' },
    description: post.excerpt,
    mainEntityOfPage: canonical,
  };

  const inner = `    <article class="blog-page">
      <div class="blog-article">
        <a class="blog-back" href="/blog/">← Alle verhalen</a>
        <header class="blog-article-header">
          <div class="blog-article-emoji">${post.emoji}</div>
          <div class="blog-article-meta">
            <span>${fmtDate(post.date)}</span>
            <span class="blog-card-dot">·</span>
            <span>${post.readMinutes} min lezen</span>
          </div>
          <h1 class="blog-article-title">${esc(post.title)}</h1>
          <p class="blog-article-lead">${esc(post.excerpt)}</p>
        </header>
        <div class="blog-article-body">
${post.body.map(blockHTML).join('\n')}
        </div>
        <footer class="blog-article-footer">
          ${post.regioSlug
            ? `<a class="btn btn-green" href="/regio/${post.regioSlug}">🗺️ Alle boerderijwinkels in ${esc(post.regioName || '')}</a>`
            : `<a class="btn btn-green" href="/">🗺️ Ontdek winkels bij jou</a>`}
          <a class="btn btn-ghost" href="/blog/">← Terug naar verhalen</a>
        </footer>
      </div>
    </article>`;

  writeFileSync(join(root, `public/blog/${post.slug}.html`),
    shell(post.title, post.excerpt, canonical, inner, jsonLd), 'utf8');
  console.log(`✓ ${post.slug}.html`);
}

/* ── Overzichtspagina ────────────────────────────────────────── */
const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
const cards = sorted.map(p => `
        <a class="blog-card" href="/blog/${p.slug}" style="text-decoration:none">
          <div class="blog-card-emoji">${p.emoji}</div>
          <div class="blog-card-body">
            <div class="blog-card-meta"><span>${fmtDate(p.date)}</span><span class="blog-card-dot">·</span><span>${p.readMinutes} min lezen</span></div>
            <h2 class="blog-card-title">${esc(p.title)}</h2>
            <p class="blog-card-excerpt">${esc(p.excerpt)}</p>
            <span class="blog-card-link">Lees verder →</span>
          </div>
        </a>`).join('');

const indexInner = `    <div class="blog-page">
      <header class="blog-header">
        <h1 class="blog-title">📖 Verhalen van het platteland</h1>
        <p class="blog-sub">Achtergrond, seizoenstips en inspiratie over lokaal en vers eten.</p>
      </header>
      <div class="blog-grid">${cards}
      </div>
    </div>`;

const indexJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'Verhalen van het platteland — Boerenroute.nl',
  url: `${SITE}/blog/`,
  blogPost: sorted.map(p => ({
    '@type': 'BlogPosting',
    headline: p.title,
    datePublished: p.date,
    url: `${SITE}/blog/${p.slug}`,
  })),
};

writeFileSync(join(root, 'public/blog/index.html'),
  shell('Verhalen van het platteland',
    'Achtergrond, seizoenstips en inspiratie over lokaal en vers eten van de boer.',
    `${SITE}/blog/`, indexInner, indexJsonLd), 'utf8');
console.log('✓ index.html');

console.log('\nKlaar.');
