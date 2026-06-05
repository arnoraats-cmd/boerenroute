import { initShops, setUserLocation }        from './shops.js';
import { geocode, getGPS, DEFAULT }          from './location.js';
import { initMap, flyTo as mapFlyTo, invalidateSize } from './map.js';
import { initRoute }                         from './route.js';
import { initModals, openSignupModal, openWerkplaatsModal } from './modals.js';
import { loadOSMShops }                      from './osm.js';
import { renderSeasonPage }                  from './season.js';
import { initBoodschappenlijst }             from './boodschappenlijst.js';
import { initStempelkaart, renderStempelkaart } from './stempelkaart.js';
import { getCount }                          from './stamps.js';
import { renderBlog }                        from './blog.js';
import { initBottomSheet }                   from './bottomsheet.js';

/* ── Kaart + modals direct initialiseren ─────────────────── */
initMap({ lat: DEFAULT.lat, lng: DEFAULT.lng });
initModals();
initBottomSheet();

/* ── Stempelkaart-badge in nav bijwerken ─────────────────── */
function _updateStampBadge() {
  const badge = document.getElementById('stampBadge');
  if (!badge) return;
  const n = getCount();
  badge.textContent = n;
  badge.hidden = n === 0;
}
_updateStampBadge();
document.addEventListener('boerenroute:stampupdate', _updateStampBadge);
document.addEventListener('boerenroute:stamp',       _updateStampBadge);

/* ── Header glass-effect ─────────────────────────────────── */
const header = document.getElementById('siteHeader');
const hero   = document.getElementById('hero');
if (header && hero) {
  new IntersectionObserver(
    ([e]) => header.classList.toggle('is-glass', !e.isIntersecting),
    { threshold: 0 }
  ).observe(hero);
}

/* ── PWA: service worker registreren ─────────────────────── */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/public/sw.js').catch(() => {});
}

/* ── PWA: installeer-prompt ──────────────────────────────── */
let _installPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _installPrompt = e;
  document.getElementById('installBtn')?.removeAttribute('hidden');
});

document.getElementById('installBtn')?.addEventListener('click', async () => {
  if (!_installPrompt) return;
  _installPrompt.prompt();
  const { outcome } = await _installPrompt.userChoice;
  if (outcome === 'accepted') document.getElementById('installBtn')?.setAttribute('hidden', '');
  _installPrompt = null;
});

/* ── Nav-tabs ────────────────────────────────────────────── */
const SECTIONS = {
  kaart:         'listSection',
  route:         'routeSection',
  boodschappen:  'boodschappenSection',
  stempelkaart:  'stempelkaartSection',
  seizoen:       'seizoenSection',
  verhalen:      'verhalenSection',
  over:          'overSection',
};

const MAP_PAGES = new Set(['kaart', 'route']);

/* Verberg de landingssectie (hero + uitgelichte banners) */
function _hideLanding() {
  if (hero) hero.hidden = true;
  document.getElementById('voordelenBanner')?.setAttribute('hidden', '');
  document.getElementById('maandHomeBanner')?.setAttribute('hidden', '');
  document.getElementById('popularRoutesBanner')?.setAttribute('hidden', '');
  // Activeer bottom-sheet layout op mobiel
  document.body.classList.add('map-active');
}

document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
  btn.addEventListener('click', () => {
    const page    = btn.dataset.page;
    const isMapPage = MAP_PAGES.has(page);

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.body.dataset.page = page; // CSS gebruikt dit o.a. om de route-FAB te verbergen

    /* Hero + landingsbanners weg zodra je naar een tab navigeert,
       anders verschijnt de sectie ónder de hero en lijkt er niets te gebeuren */
    _hideLanding();

    /* Toolbar + kaart alleen zichtbaar op kaart/route */
    const toolbar     = document.getElementById('toolbar');
    const contentWrap = document.querySelector('.content-wrap');
    if (toolbar)     toolbar.hidden     = !isMapPage;
    if (contentWrap) contentWrap.hidden = !isMapPage;
    /* osmIndicator: verberg bij weggaan, herstel bij terugkeer als OSM geladen is */
    const osmInd = document.getElementById('osmIndicator');
    if (osmInd) osmInd.hidden = !isMapPage || _osmExtraCount === 0;

    Object.entries(SECTIONS).forEach(([p, id]) => {
      const el = document.getElementById(id);
      if (el) el.hidden = p !== page;
    });

    if (page === 'seizoen')       renderSeasonPage('seizoenSection');
    if (page === 'stempelkaart') renderStempelkaart('stempelkaartSection');
    if (page === 'verhalen')     renderBlog('verhalenSection');
    if (isMapPage) requestAnimationFrame(() => invalidateSize());

    /* Naar boven zodat de gekozen sectie meteen in beeld staat */
    window.scrollTo({ top: 0, behavior: 'auto' });
  });
});

/* Deep-link: ?verhaal=slug opent direct de Verhalen-tab */
if (new URLSearchParams(location.search).has('verhaal')) {
  document.querySelector('.nav-btn[data-page="verhalen"]')?.click();
}

/* Footer-hashlinks (#verhalen, #seizoen, …) schakelen naar de juiste tab */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  const page = a.getAttribute('href').slice(1);
  if (SECTIONS[page]) {
    a.addEventListener('click', e => {
      e.preventDefault();
      document.querySelector(`.nav-btn[data-page="${page}"]`)?.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});

/* ── Drijvende tip-knop (mobiel) ─────────────────────────── */
['contactTipBtn', 'footerContactLink'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', e => {
    e.preventDefault();
    import('./modals.js').then(({ openTipModal }) => openTipModal());
  });
});

document.getElementById('floatTipBtn')?.addEventListener('click', () => {
  import('./modals.js').then(({ openTipModal }) => openTipModal());
});

/* ── Reparatieschuur (probleem melden + snelle reparatie) ── */
document.getElementById('werkplaatsLink')?.addEventListener('click', e => {
  e.preventDefault();
  openWerkplaatsModal();
});

/* ── iOS PWA-hint ────────────────────────────────────────── */
(function () {
  const isIOS        = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                     || window.navigator.standalone;
  const dismissed    = sessionStorage.getItem('ios-hint-dismissed');

  if (isIOS && !isStandalone && !dismissed) {
    setTimeout(() => {
      const hint = document.getElementById('iosHint');
      if (hint) hint.hidden = false;
    }, 4000);
  }

  document.getElementById('iosHintClose')?.addEventListener('click', () => {
    document.getElementById('iosHint').hidden = true;
    sessionStorage.setItem('ios-hint-dismissed', '1');
  });
})();

/* ── Footer "winkel aanmelden"-link ──────────────────────── */
document.getElementById('signupLink')?.addEventListener('click', e => {
  e.preventDefault();
  openSignupModal();
});

/* ── Route-leeg: terug naar kaart-knop ───────────────────── */
document.getElementById('routeGoToKaart')?.addEventListener('click', () => {
  document.querySelector('.nav-btn[data-page="kaart"]')?.click();
});

/* ── Hero-elementen ──────────────────────────────────────── */
const heroGpsBtn       = document.getElementById('heroGpsBtn');
const heroSearchBtn    = document.getElementById('heroSearchBtn');
const heroSearch       = document.getElementById('heroSearch');
const heroSearchInput  = document.getElementById('heroSearchInput');
const heroSearchSubmit = document.getElementById('heroSearchSubmit');

heroSearchBtn?.addEventListener('click', () => {
  const opening = heroSearch.hidden;
  heroSearch.hidden = !opening;
  if (opening) heroSearchInput?.focus();
});

heroSearchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') _submitSearch(); });
heroSearchSubmit?.addEventListener('click', _submitSearch);

heroGpsBtn?.addEventListener('click', async () => {
  _setBusy(heroGpsBtn, '📍 Locatie ophalen…');
  try {
    const { lat, lng } = await getGPS();
    _applyLocation(lat, lng, 'Jouw locatie');
  } catch (e) {
    _showError(e.message);
  } finally {
    _resetBusy(heroGpsBtn);
  }
});

async function _submitSearch() {
  const q = heroSearchInput?.value.trim();
  if (!q) { heroSearchInput?.focus(); return; }
  _setBusy(heroSearchSubmit, 'Zoeken…');
  heroSearchInput.disabled = true;
  _clearError();
  try {
    const { lat, lng, name } = await geocode(q);
    _applyLocation(lat, lng, name);
  } catch (e) {
    _showError(e.message);
  } finally {
    _resetBusy(heroSearchSubmit);
    heroSearchInput.disabled = false;
  }
}

function _applyLocation(lat, lng, name) {
  /* Sla locatie op zodat andere modules hem kunnen lezen */
  window._brLat = lat;
  window._brLng = lng;
  setUserLocation(lat, lng);
  mapFlyTo(lat, lng, 12);
  _hideLanding();
  document.getElementById('mainLayout')?.scrollIntoView({ behavior: 'smooth' });
  _showCrumb(name);
  _triggerOSM(lat, lng);
}

/* ── OSM laden na locatie-keuze + bij straal-wijziging ────── */
let _osmShops      = [];
let _osmExtraCount = 0; // aantal daadwerkelijk toegevoegde OSM-locaties (na dedup)
let _baseShops     = [];
let _lastLat   = null;
let _lastLng   = null;

document.getElementById('osmRadius')?.addEventListener('change', () => {
  if (_lastLat != null) _triggerOSM(_lastLat, _lastLng);
});

async function _triggerOSM(lat, lng) {
  _lastLat = lat; _lastLng = lng;
  const radiusEl = document.getElementById('osmRadius');
  const radius   = radiusEl ? +radiusEl.value : 50;
  if (!radius) return;

  const indicator = document.getElementById('osmIndicator');
  if (indicator) { indicator.hidden = false; indicator.textContent = 'Extra winkels laden…'; }

  try {
    _osmShops = await loadOSMShops(lat, lng, radius);
    // Verwijder OSM-shops die te dicht bij een bestaand shop liggen (< 200m)
    const deduped = _osmShops.filter(osm =>
      !_baseShops.some(b => _dist(b.lat, b.lng, osm.lat, osm.lng) < 0.2)
    );
    _osmExtraCount = deduped.length;
    if (deduped.length && typeof window._addOSMShops === 'function') {
      window._addOSMShops(deduped);
    }
    if (indicator) {
      if (deduped.length > 0) {
        indicator.textContent = `+${deduped.length} extra locaties via OpenStreetMap`;
      } else {
        indicator.hidden = true;
      }
    }
  } catch {
    if (indicator) indicator.textContent = 'OpenStreetMap niet beschikbaar';
  }
}

function _dist(la1,lo1,la2,lo2) {
  const R=6371,dL=(la2-la1)*Math.PI/180,dG=(lo2-lo1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dG/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

/* ── Locatie-breadcrumb ───────────────────────────────────── */
function _showCrumb(name) {
  const header = document.querySelector('.list-header');
  if (!header) return;
  let crumb = document.getElementById('locationCrumb');
  if (!crumb) {
    crumb = document.createElement('div');
    crumb.id = 'locationCrumb';
    crumb.className = 'location-crumb';
    header.insertAdjacentElement('afterend', crumb);
  }
  crumb.innerHTML = `
    <span class="crumb-icon">📍</span>
    <span class="crumb-label">Afstand vanuit <strong>${_esc(name)}</strong></span>
    <button class="crumb-reset" id="crumbReset" aria-label="Reset locatie">✕</button>`;
  document.getElementById('crumbReset')?.addEventListener('click', () => {
    setUserLocation(DEFAULT.lat, DEFAULT.lng);
    mapFlyTo(DEFAULT.lat, DEFAULT.lng, 11);
    crumb.remove();
    const osmInd = document.getElementById('osmIndicator');
    if (osmInd) osmInd.hidden = true;
    hero.hidden = false;
    document.getElementById('voordelenBanner')?.removeAttribute('hidden');
    document.getElementById('maandHomeBanner')?.removeAttribute('hidden');
    document.getElementById('popularRoutesBanner')?.removeAttribute('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ── Hulpfuncties hero-knoppen ───────────────────────────── */
function _setBusy(btn, label) {
  if (!btn) return;
  btn.dataset.orig = btn.innerHTML;
  btn.innerHTML    = label;
  btn.disabled     = true;
}
function _resetBusy(btn) {
  if (!btn) return;
  btn.innerHTML = btn.dataset.orig ?? btn.innerHTML;
  btn.disabled  = false;
}
function _showError(msg) {
  _clearError();
  const el = Object.assign(document.createElement('p'), {
    id: 'heroError', className: 'hero-error', textContent: msg,
  });
  heroSearch.insertAdjacentElement('afterend', el);
  setTimeout(() => el.remove(), 5000);
}
function _clearError() { document.getElementById('heroError')?.remove(); }
function _esc(s) {
  return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Shops + Route laden ─────────────────────────────────── */
fetch('src/data/verifiedShops.json')
  .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
  .then(shops => {
    _baseShops = shops;
    initShops(shops);
    initRoute(shops);
    initBoodschappenlijst(shops);
    initStempelkaart(shops);

    /* Render routes op homepage zodra shops bekend zijn (race-safe) */
    if (_routesData) {
      const featured = _routesData.routes.find(r => r.featured) || _routesData.routes[0];
      _renderMaandHome(featured, _routesData.maand);
      _renderPopularRoutes(_routesData);
    }

    /* Deep-link: ?route=1,5,6 laadt die winkels in de route (vanaf een regiopagina) */
    const routeParam = new URLSearchParams(location.search).get('route');
    if (routeParam) {
      const ids = routeParam.split(',').map(Number).filter(Boolean);
      import('./route.js').then(({ toggleStop, getStops }) => {
        ids.forEach(id => { if (!getStops().some(s => s.id === id)) toggleStop(id); });
        document.querySelector('.nav-btn[data-page="route"]')?.click();
      });
    }

    /* Expose voor OSM-toevoeging */
    window._addOSMShops = extraShops => {
      const all = [...shops, ...extraShops];
      initShops(all);
      initRoute(all);
    };
  })
  .catch(err => {
    const el = document.getElementById('listCount');
    if (el) el.textContent = 'Laden mislukt — herlaad de pagina';
    console.error(err);
  });

/* ── Populaire routes laden ──────────────────────────────── */
let _routesData = null;
fetch('src/data/routes.json')
  .then(r => r.json())
  .then(data => {
    _routesData = data;
    const featured = data.routes.find(r => r.featured) || data.routes[0];
    _renderMaandRoute(featured, data.maand);
    _renderMaandHome(featured, data.maand);
    _renderPopularRoutes(data);
  })
  .catch(() => {});

function _loadRouteStops(route) {
  document.querySelector('[data-page="route"]')?.click();
  import('./route.js').then(({ toggleStop, getStops }) => {
    route.stopIds.forEach(id => {
      if (!getStops().some(s => s.id === id)) toggleStop(id);
    });
  });
}

/* Compacte versie op de "Over ons"-pagina */
function _renderMaandRoute(route, maand) {
  const el = document.getElementById('maandRoute');
  if (!el) return;
  el.innerHTML = `
    <div class="maand-card">
      <div class="maand-badge">🗓️ ${_esc(maand)}</div>
      <h3 class="maand-title">${route.emoji} ${_esc(route.titel)}</h3>
      <p class="maand-sub">${_esc(route.subtitel)}</p>
      <p class="maand-intro">${_esc(route.intro)}</p>
      <div class="maand-meta">
        <span>📏 ${_esc(route.afstand)}</span>
        <span>📍 ${route.stopIds.length} stops</span>
      </div>
      <button class="btn btn-green" id="loadMaandRoute">🚴 Laad deze route</button>
    </div>`;
  document.getElementById('loadMaandRoute')
    ?.addEventListener('click', () => _loadRouteStops(route));
}

/* Prominente showcase op de homepage met echte stops */
function _renderMaandHome(route, maand) {
  const el = document.getElementById('maandRouteHome');
  if (!el) return;

  /* Zoek de echte stop-winkels op naam/emoji */
  const stops = route.stopIds
    .map(id => _baseShops.find(s => s.id === id))
    .filter(Boolean);

  const stopsHTML = stops.map((s, i) => `
    <li class="maandhome-stop">
      <span class="maandhome-stop-num">${i + 1}</span>
      <span class="maandhome-stop-emoji">${s.emoji}</span>
      <span class="maandhome-stop-name">${_esc(s.name)}</span>
    </li>`).join('');

  el.innerHTML = `
    <div class="maandhome-card">
      <div class="maandhome-left">
        <div class="maandhome-badge">🗓️ Boerenroute van de maand &middot; ${_esc(maand)}</div>
        <h2 class="maandhome-title">${route.emoji} ${_esc(route.titel)}</h2>
        <p class="maandhome-sub">${_esc(route.subtitel)}</p>
        <p class="maandhome-intro">${_esc(route.intro)}</p>
        <div class="maandhome-meta">
          <span class="maandhome-meta-item">📏 <strong>${_esc(route.afstand)}</strong></span>
          <span class="maandhome-meta-item">📍 <strong>${stops.length}</strong> stops</span>
          <span class="maandhome-meta-item">🚴 op de fiets</span>
        </div>
        <button class="btn btn-primary maandhome-btn" id="loadMaandRouteHome">
          🚴 Laad deze route op de kaart
        </button>
      </div>
      <div class="maandhome-right">
        <div class="maandhome-stops-label">De route langs:</div>
        <ol class="maandhome-stops">${stopsHTML}</ol>
      </div>
    </div>`;

  document.getElementById('loadMaandRouteHome')
    ?.addEventListener('click', () => _loadRouteStops(route));
}

/* Grid met overige populaire routes op de homepage */
function _renderPopularRoutes(data) {
  const el = document.getElementById('popularRoutes');
  if (!el) return;

  const others = data.routes.filter(r => !r.featured);
  if (others.length === 0) { el.closest('.poproutes')?.setAttribute('hidden', ''); return; }

  el.innerHTML = others.map((route, idx) => {
    const stops = route.stopIds
      .map(id => _baseShops.find(s => s.id === id))
      .filter(Boolean);
    const emojis = stops.map(s => `<span class="poproute-stopemoji" title="${_esc(s.name)}">${s.emoji}</span>`).join('');
    return `
      <article class="poproute-card">
        <div class="poproute-top">
          <span class="poproute-emoji">${route.emoji}</span>
          <span class="poproute-prov">${_esc(route.provincie)}</span>
        </div>
        <h3 class="poproute-title">${_esc(route.titel)}</h3>
        <p class="poproute-sub">${_esc(route.subtitel)}</p>
        <div class="poproute-stopemojis">${emojis}</div>
        <div class="poproute-meta">
          <span>📏 ${_esc(route.afstand)}</span>
          <span>📍 ${stops.length} stops</span>
        </div>
        <button class="btn btn-ghost poproute-btn" data-route="${idx}">🚴 Laad route</button>
      </article>`;
  }).join('');

  el.querySelectorAll('.poproute-btn').forEach(btn => {
    btn.addEventListener('click', () => _loadRouteStops(others[+btn.dataset.route]));
  });
}
