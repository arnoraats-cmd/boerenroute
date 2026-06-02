/* ═══════════════════════════════════════════════════════════════
   blog.js — Verhalen: overzicht + losse artikelen in de app
   Statische SEO-pagina's worden los gegenereerd (scripts/gen-blog.mjs)
   ═══════════════════════════════════════════════════════════════ */

let _posts = [];
let _loaded = false;

/* ══ Laden ═══════════════════════════════════════════════════════ */

async function _load() {
  if (_loaded) return _posts;
  try {
    const res = await fetch('src/data/blog.json');
    _posts = await res.json();
  } catch {
    _posts = [];
  }
  _loaded = true;
  return _posts;
}

/* ══ Render overzicht ════════════════════════════════════════════ */

export async function renderBlog(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  /* Check of er een ?verhaal=slug in de URL staat (diep linken) */
  const params = new URLSearchParams(location.search);
  const slug   = params.get('verhaal');

  await _load();

  if (slug) {
    const post = _posts.find(p => p.slug === slug);
    if (post) { _renderArticle(el, post); return; }
  }

  _renderList(el);
}

function _renderList(el) {
  const sorted = [..._posts].sort((a, b) => new Date(b.date) - new Date(a.date));

  el.innerHTML = `
<div class="blog-page">
  <header class="blog-header">
    <h1 class="blog-title">📖 Verhalen van het platteland</h1>
    <p class="blog-sub">Achtergrond, seizoenstips en inspiratie over lokaal en vers eten.</p>
  </header>

  <div class="blog-grid">
    ${sorted.map(_cardHTML).join('')}
  </div>
</div>`;

  el.querySelectorAll('.blog-card').forEach(card => {
    card.addEventListener('click', () => {
      const post = _posts.find(p => p.slug === card.dataset.slug);
      if (post) {
        _renderArticle(el, post);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

function _cardHTML(post) {
  return `
<article class="blog-card" data-slug="${_e(post.slug)}" role="button" tabindex="0"
  aria-label="Lees: ${_e(post.title)}">
  <div class="blog-card-emoji">${post.emoji}</div>
  <div class="blog-card-body">
    <div class="blog-card-meta">
      <span>${_fmtDate(post.date)}</span>
      <span class="blog-card-dot">·</span>
      <span>${post.readMinutes} min lezen</span>
    </div>
    <h2 class="blog-card-title">${_e(post.title)}</h2>
    <p class="blog-card-excerpt">${_e(post.excerpt)}</p>
    <span class="blog-card-link">Lees verder →</span>
  </div>
</article>`;
}

/* ══ Render artikel ══════════════════════════════════════════════ */

function _renderArticle(el, post) {
  el.innerHTML = `
<div class="blog-page">
  <article class="blog-article">
    <button class="blog-back" id="blogBack">← Alle verhalen</button>

    <header class="blog-article-header">
      <div class="blog-article-emoji">${post.emoji}</div>
      <div class="blog-article-meta">
        <span>${_fmtDate(post.date)}</span>
        <span class="blog-card-dot">·</span>
        <span>${post.readMinutes} min lezen</span>
      </div>
      <h1 class="blog-article-title">${_e(post.title)}</h1>
      <p class="blog-article-lead">${_e(post.excerpt)}</p>
    </header>

    <div class="blog-article-body">
      ${post.body.map(_blockHTML).join('')}
    </div>

    <footer class="blog-article-footer">
      <a class="btn btn-green" href="#" id="blogToMap">🗺️ Ontdek winkels bij jou</a>
      <button class="btn btn-ghost" id="blogBack2">← Terug naar verhalen</button>
    </footer>
  </article>
</div>`;

  const back = () => { _renderList(el); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  el.querySelector('#blogBack') ?.addEventListener('click', back);
  el.querySelector('#blogBack2')?.addEventListener('click', back);
  el.querySelector('#blogToMap')?.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector('.nav-btn[data-page="kaart"]')?.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function _blockHTML(block) {
  switch (block.type) {
    case 'h2': return `<h2>${_e(block.text)}</h2>`;
    case 'p':  return `<p>${_e(block.text)}</p>`;
    case 'ul': return `<ul>${block.items.map(i => `<li>${_e(i)}</li>`).join('')}</ul>`;
    default:   return '';
  }
}

/* ══ Helpers ═════════════════════════════════════════════════════ */

function _fmtDate(iso) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function _e(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
