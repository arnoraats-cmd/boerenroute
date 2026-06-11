import { initShops, setUserLocation }        from './shops.js';
import { geocode, getGPS, DEFAULT }          from './location.js';
import { initMap, flyTo as mapFlyTo, invalidateSize, setLegendTypes } from './map.js';
import { initRoute }                         from './route.js';
import { initModals, openSignupModal, openWerkplaatsModal, openShopModal } from './modals.js';
import { loadOSMShops }                      from './osm.js';
import { renderSeasonPage }                  from './season.js';
import { initBoodschappenlijst }             from './boodschappenlijst.js';
import { initStempelkaart, renderStempelkaart } from './stempelkaart.js';
import { getCount }                          from './stamps.js';
import { renderBlog }                        from './blog.js';
import { initBottomSheet }                   from './bottomsheet.js';
import { shopIcon, emojiIcon }               from './icons.js';

/* ── Kaart + modals direct initialiseren ─────────────────── */
initMap({ lat: DEFAULT.lat, lng: DEFAULT.lng });
initModals();
initBottomSheet();
window.addEventListener('boerenroute:relayout', () => invalidateSize());


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
  requestAnimationFrame(() => invalidateSize());
  // Onboarding-tooltip — eenmalig per apparaat (localStorage), dismissible
  if (window.innerWidth <= 900 && !localStorage.getItem('br_onboard_v1')) {
    const tip = document.getElementById('sheetOnboardTip');
    if (tip) {
      tip.removeAttribute('hidden');

      function _dismissTip() {
        tip.setAttribute('hidden', '');
        localStorage.setItem('br_onboard_v1', '1');
      }

      // Klik op de tip zelf (of de ×-knop) sluit hem
      tip.addEventListener('click', _dismissTip, { once: true });

      // Sheet-handle interactie sluit ook de tip
      const handle = document.querySelector('.sheet-handle');
      handle?.addEventListener('pointerdown', _dismissTip, { once: true });

      // Vangnet: verdwijnt na 10 seconden als gebruiker niets doet
      setTimeout(_dismissTip, 10000);
    }
  }
}

/* ── Meer-menu (mobiel) ──────────────────────────────────── */
const meerBtn   = document.getElementById('navMeerBtn');
const meerPanel = document.getElementById('navMeerPanel');
meerBtn?.addEventListener('click', e => {
  e.stopPropagation();
  const open = !meerPanel.hidden;
  meerPanel.hidden = open;
  meerBtn.setAttribute('aria-expanded', String(!open));
});
document.addEventListener('click', () => { if (meerPanel) meerPanel.hidden = true; });
document.querySelectorAll('.nav-meer-item').forEach(item => {
  item.addEventListener('click', () => {
    meerPanel.hidden = true;
    // Trigger dezelfde logica als nav-btn
    const page = item.dataset.page;
    document.querySelector(`.nav-btn[data-page="${page}"]`)?.click();
  });
});

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
      // Als de onboarding-tip nog zichtbaar is (gebruiker koos snel een locatie),
      // wacht dan tot die weg is voor we de iOS-hint tonen — twee tips tegelijk is te druk.
      const onboardTip  = document.getElementById('sheetOnboardTip');
      const extraDelay  = (onboardTip && !onboardTip.hidden) ? 11000 : 0;
      setTimeout(() => {
        const hint = document.getElementById('iosHint');
        if (!hint) return;
        hint.hidden = false;
        setTimeout(() => {
          hint.hidden = true;
          sessionStorage.setItem('ios-hint-dismissed', '1');
        }, 5000);
      }, extraDelay);
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

/* ── Automatische routegeneratie ("Maak een route voor mij") ── */
/* Meer filters: houdt de mobiele toolbar rustig zonder filters te verstoppen. */
const moreFiltersBtn     = document.getElementById('moreFiltersBtn');
const moreFiltersPanel   = document.getElementById('moreFiltersPanel');
const moreFiltersOverlay = document.getElementById('moreFiltersOverlay');

function _closeMoreFilters() {
  if (!moreFiltersPanel) return;
  moreFiltersPanel.hidden = true;
  moreFiltersBtn?.setAttribute('aria-expanded', 'false');
  if (moreFiltersOverlay) moreFiltersOverlay.hidden = true;
}

moreFiltersBtn?.addEventListener('click', e => {
  e.stopPropagation();
  if (!moreFiltersPanel) return;
  const opening = moreFiltersPanel.hidden;
  moreFiltersPanel.hidden = !opening;
  moreFiltersBtn.setAttribute('aria-expanded', String(opening));
  if (moreFiltersOverlay) moreFiltersOverlay.hidden = !opening;
});
moreFiltersPanel?.addEventListener('click', e => e.stopPropagation());
moreFiltersOverlay?.addEventListener('click', _closeMoreFilters);
document.addEventListener('click', _closeMoreFilters);

/* Toon hoeveel "verstopte" filters actief zijn, ook als het paneel dicht is.
   Telt: 'Nu open' aan + OSM-straal afwijkend van de standaard (15 km). */
function _updateFiltersCount() {
  const openNow = document.getElementById('openNowToggle')?.checked;
  const radius  = document.getElementById('osmRadius')?.value;
  const n = (openNow ? 1 : 0) + (radius && radius !== '15' ? 1 : 0);
  const badge = document.getElementById('moreFiltersCount');
  moreFiltersBtn?.classList.toggle('has-active', n > 0);
  if (badge) { badge.textContent = String(n); badge.hidden = n === 0; }
}
document.getElementById('openNowToggle')?.addEventListener('change', _updateFiltersCount);
document.getElementById('osmRadius')?.addEventListener('change', _updateFiltersCount);
_updateFiltersCount();

let _genTarget  = null;   // laatst gekozen doelafstand
let _genVariant = 0;      // variatie-teller voor "andere route"
let _genBusy    = false;

async function _generateAndLoad(targetKm, variant = 0) {
  if (_genBusy) return;
  _genBusy = true;
  _genTarget = targetKm;

  const statusEl  = document.getElementById('routeGenStatus');
  const setStatus = msg => { if (statusEl) { statusEl.hidden = false; statusEl.textContent = msg; } };
  const anotherBtn = document.getElementById('anotherRouteBtn');

  const start = { lat: window._brLat ?? DEFAULT.lat, lng: window._brLng ?? DEFAULT.lng };
  const pool  = _baseShops.concat(_osmShops || []);

  setStatus(variant ? 'Andere route samenstellen…' : 'Route samenstellen…');
  const { generateTunedRoute }   = await import('./autoroute.js');
  const { orderLoop, loadStops } = await import('./route.js');
  const { routeVia }             = await import('./routing.js');

  /* Meet de werkelijke lus-afstand met dezelfde ordening als de tekening */
  const measure = async (shops) => {
    const ordered = orderLoop(shops, shops[0]);
    const pts = ordered.map(s => ({ lat: s.lat, lng: s.lng }));
    pts.push({ lat: ordered[0].lat, lng: ordered[0].lng });
    const r = await routeVia(pts, { profile: 'trekking' });
    return r?.distanceKm || 0;
  };

  const best = await generateTunedRoute(pool, start, targetKm, measure, {
    variant,
    onStep: ({ dist }) => setStatus(`Route afstemmen op ${targetKm} km… (${dist.toFixed(0)} km)`),
  });

  _genBusy = false;

  if (!best || best.picked.length < 3) {
    setStatus('Te weinig verkooppunten in de buurt — kies eerst een locatie of een grotere afstand.');
    return;
  }
  setStatus(`Route gemaakt: ~${best.dist.toFixed(0)} km langs ${best.picked.length} verkooppunten.`);
  loadStops(best.picked, { optimize: true });
  if (anotherBtn) { anotherBtn.hidden = false; anotherBtn.textContent = '🔄 Andere route'; }
  /* Toon het resultaat: spring naar de route-tab */
  document.querySelector('.nav-btn[data-page="route"]')?.click();
}

/* Document-brede delegatie zodat de knoppen op meerdere plekken werken
   (kaart-strip én lege-route-staat). */
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-gen]');
  if (!btn) return;
  _genVariant = 0;
  _generateAndLoad(+btn.dataset.gen, 0);
});

/* "Andere route" — zelfde afstand, andere lus */
document.getElementById('anotherRouteBtn')?.addEventListener('click', () => {
  if (_genTarget == null) return;
  _genVariant += 1;
  _generateAndLoad(_genTarget, _genVariant);
});

/* Verberg de "andere route"-knop zodra de route leeg is */
document.addEventListener('boerenroute:routechange', () => {
  import('./route.js').then(({ getCount }) => {
    const b = document.getElementById('anotherRouteBtn');
    if (b && getCount() === 0) b.hidden = true;
  });
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

/* Hero → naar de kant-en-klare fietsroutes (carrousel) scrollen */
document.getElementById('heroRoutesBtn')?.addEventListener('click', () => {
  document.getElementById('popularRoutesBanner')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

heroSearchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') _submitSearch(); });
heroSearchSubmit?.addEventListener('click', _submitSearch);

async function _locateMe(btn) {
  if (btn) _setBusy(btn, '📍 Locatie ophalen…');
  try {
    const { lat, lng } = await getGPS();
    _applyLocation(lat, lng, 'Jouw locatie');
  } catch (e) {
    _showError(e.message);
  } finally {
    if (btn) _resetBusy(btn);
  }
}

heroGpsBtn?.addEventListener('click', () => _locateMe(heroGpsBtn));
document.getElementById('toolbarGpsBtn')?.addEventListener('click', e => _locateMe(e.currentTarget));

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
  const radius   = radiusEl ? +radiusEl.value : 15;
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
    <span class="crumb-label">Winkels bij <strong>${_esc(name)}</strong></span>
    <button class="crumb-reset" id="crumbReset" aria-label="Andere locatie kiezen">Locatie wijzigen</button>`;
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
    _renderHeroPreview();
    setLegendTypes(new Set(shops.map(s => s.type)));

    /* Render routes op homepage zodra shops bekend zijn (race-safe) */
    if (_routesData) {
      const picked = _pickMaandRoute(_routesData);
      if (picked) _renderMaandHome(picked.route, picked.maand);
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

/* Kiest de juiste maand-route op basis van de huidige datum.
   Prioriteit: 1) handmatige entry in maandRoutes  2) automatische provincierotatie
   Nieuwe handmatige maanden toevoegen = alleen routes.json aanpassen, geen code. */
function _pickMaandRoute(data) {
  const MAANDEN = ['Januari','Februari','Maart','April','Mei','Juni',
                   'Juli','Augustus','September','Oktober','November','December'];
  const now = new Date();
  const cy = now.getFullYear(), cm = now.getMonth() + 1;
  const maandLabel = `${MAANDEN[cm - 1]} ${cy}`;

  // 1. Handmatige entry voor exacte jaar+maand
  if (Array.isArray(data.maandRoutes) && data.maandRoutes.length) {
    const exact = data.maandRoutes.find(e => e.year === cy && e.month === cm);
    if (exact) return { route: exact.route, maand: exact.maand };
  }

  // 2. Automatische provincierotatie (maandnummer 1–12 → index 0–11)
  const prov = data.provincieRoutes || [];
  if (prov.length) {
    const r = prov[(cm - 1) % prov.length];
    return {
      route: { ...r, subtitel: r.subtitel || `Ontdek ${r.provincie} op de fiets` },
      maand: maandLabel,
    };
  }

  // 3. Oud formaat (backwards compat)
  const route = (data.routes || []).find(r => r.featured) || data.routes?.[0];
  return route ? { route, maand: data.maand || maandLabel } : null;
}

let _routesData = null;
fetch('src/data/routes.json')
  .then(r => r.json())
  .then(data => {
    _routesData = data;
    const picked = _pickMaandRoute(data);
    if (picked) {
      _renderMaandRoute(picked.route, picked.maand);
      _renderMaandHome(picked.route, picked.maand);
    }
    _renderPopularRoutes(data);
  })
  .catch(() => {});

function _loadRouteStops(route) {
  document.querySelector('[data-page="route"]')?.click();
  import('./route.js').then(({ loadStops }) => {
    /* Gecureerde volgorde behouden (niet her-optimaliseren) */
    loadStops(route.stopIds, { optimize: false });
  });
}

/* Compacte versie op de "Over ons"-pagina */
function _renderMaandRoute(route, maand) {
  const el = document.getElementById('maandRoute');
  if (!el) return;
  el.innerHTML = `
    <div class="maand-card">
      <div class="maand-badge">🗓️ ${_esc(maand)}</div>
      <h3 class="maand-title"><span class="maand-title-ic">${emojiIcon(route.emoji, { size: 22 })}</span>${_esc(route.titel)}</h3>
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

/* Mini-preview in de hero: 3 echte topwinkels (1 per hoofdtype) — toont meteen waarde.
   Klik opent de winkeldetail. Verdwijnt vanzelf met de hero zodra een locatie gekozen is. */
function _renderHeroPreview() {
  const el = document.getElementById('heroPreview');
  if (!el || !_baseShops?.length) return;

  const score = s => (s.googleRating || 0) + Math.min(s.googleReviews || 0, 300) / 3000;
  const rated = _baseShops.filter(s => s.googleRating && s.type !== 'onderweg');
  const pick = [];
  for (const t of ['winkel', 'zelfpluk', 'automaat']) {
    const best = rated.filter(s => s.type === t && !pick.includes(s)).sort((a, b) => score(b) - score(a))[0];
    if (best) pick.push(best);
  }
  /* Aanvullen tot 3 met de hoogst gewaardeerde overige winkels */
  if (pick.length < 3) {
    for (const s of [...rated].sort((a, b) => score(b) - score(a))) {
      if (pick.length >= 3) break;
      if (!pick.includes(s)) pick.push(s);
    }
  }
  if (!pick.length) return;

  const place = s => (s.address || '').split(',').pop().trim();
  el.innerHTML = `
    <p class="hero-preview-label">Populair bij fietsers — zo ziet het eruit</p>
    <div class="hero-preview-cards">
      ${pick.map(s => `
        <button class="hero-preview-card" type="button" data-id="${s.id}"
                aria-label="Bekijk ${_esc(s.name)} in ${_esc(place(s))}">
          <span class="hero-preview-ic">${shopIcon(s, { size: 22, stroke: '#356611', sw: 1.85 })}</span>
          <span class="hero-preview-body">
            <span class="hero-preview-name">${_esc(s.name)}</span>
            <span class="hero-preview-place">${_esc(place(s))}</span>
          </span>
          <span class="hero-preview-rating">★ ${s.googleRating.toFixed(1).replace('.', ',')}</span>
        </button>`).join('')}
    </div>`;
  el.hidden = false;

  el.querySelectorAll('.hero-preview-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = _baseShops.find(x => x.id === +btn.dataset.id);
      if (s) openShopModal(s);
    });
  });
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
      <span class="maandhome-stop-emoji">${shopIcon(s, { size: 18 })}</span>
      <span class="maandhome-stop-name">${_esc(s.name)}</span>
    </li>`).join('');

  el.innerHTML = `
    <div class="maandhome-card">
      <div class="maandhome-left">
        <div class="maandhome-badge">🗓️ Boerenroute van de maand &middot; ${_esc(maand)}</div>
        <h2 class="maandhome-title"><span class="maandhome-title-ic">${emojiIcon(route.emoji, { size: 26 })}</span>${_esc(route.titel)}</h2>
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

/* Carrousel: één kant-en-klare route per provincie (alle 12) op de homepage */
function _renderPopularRoutes(data) {
  const el = document.getElementById('popularRoutes');
  if (!el) return;

  const routes = data.provincieRoutes || [];
  if (routes.length === 0) { el.closest('.poproutes')?.setAttribute('hidden', ''); return; }

  el.innerHTML = routes.map((route, idx) => {
    const stops = (route.stopIds || [])
      .map(id => _baseShops.find(s => s.id === id))
      .filter(Boolean);
    const emojis = stops.map(s => `<span class="poproute-stopemoji" title="${_esc(s.name)}">${shopIcon(s, { size: 18 })}</span>`).join('');
    return `
      <article class="poproute-card">
        <div class="poproute-top">
          <span class="poproute-emoji">${emojiIcon(route.emoji, { size: 24 })}</span>
          <span class="poproute-prov">${_esc(route.provincie)}</span>
        </div>
        <h3 class="poproute-title">${_esc(route.titel)}</h3>
        <p class="poproute-sub">${_esc(route.intro || route.subtitel || '')}</p>
        <div class="poproute-stopemojis">${emojis}</div>
        <div class="poproute-meta">
          <span>📏 ${_esc(route.afstand)}</span>
          <span>📍 ${stops.length} stops</span>
        </div>
        <button class="btn btn-ghost poproute-btn" data-route="${idx}">🚴 Laad route</button>
      </article>`;
  }).join('');

  el.querySelectorAll('.poproute-btn').forEach(btn => {
    btn.addEventListener('click', () => _loadRouteStops(routes[+btn.dataset.route]));
  });

  /* Pijl-knoppen (desktop) scrollen de carrousel een kaartbreedte verder. */
  const wrap = el.closest('.poproutes-inner');
  wrap?.querySelectorAll('[data-poproll]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir  = btn.dataset.poproll === 'next' ? 1 : -1;
      const card = el.querySelector('.poproute-card');
      const step = card ? card.getBoundingClientRect().width + 16 : 300;
      el.scrollBy({ left: dir * step, behavior: 'smooth' });
    });
  });
}
