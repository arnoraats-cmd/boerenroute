/* ═══════════════════════════════════════════════════════════════
   shops.js — winkellijst: filteren, sorteren, renderen
   ═══════════════════════════════════════════════════════════════ */

import { renderMarkers, highlightMarker, flyTo } from './map.js';
import { toggleStop, isInRoute } from './route.js';
import { openShopModal } from './modals.js';
import { hasVisited } from './stamps.js';
import { shopIcon } from './icons.js';

/* ── State ──────────────────────────────────────────────────── */
let allShops     = [];
let userLat      = 51.6606;
let userLng      = 5.6188;
let _located     = false;   // true zodra een echte locatie is gekozen (GPS/zoek); in verken-modus blijft het false
let activeFilter = 'all';
let searchQuery  = '';
let sortBy       = 'naam';
let showOpenOnly = false;
let showFavOnly  = false;
const favorites  = new Set();

/* Render-limiet: niet honderden kaartjes/markers tegelijk (mobiel-performance) */
const BASE_LIMIT    = 80;
const LANDING_LIMIT = 20; // mobiel zonder locatie: korte preview zodat footer bereikbaar blijft
let _limit = BASE_LIMIT;

/* ── DOM ────────────────────────────────────────────────────── */
const $       = id => document.getElementById(id);
const listEl  = () => $('shopList');
const countEl = () => $('listCount');
const emptyEl = () => $('listEmpty');

/* ══ Publiek API ════════════════════════════════════════════════ */

let _bound = false;

export function initShops(shops) {
  allShops = shops;
  _syncFilterChips();

  /* Controls + globale listeners maar één keer binden.
     initShops wordt opnieuw aangeroepen bij het toevoegen van OSM-winkels;
     zonder deze guard stapelen de listeners zich op. */
  if (!_bound) {
    _bindControls();

    /* Stamp-update → herrender de lijst zodat bezocht-badges kloppen */
    document.addEventListener('boerenroute:stampupdate', () => _render());

    /* Route-change → herrender knoppen op kaarten */
    document.addEventListener('boerenroute:routechange', () => {
      listEl()?.querySelectorAll('.card-route-btn').forEach(btn => {
        const id   = +btn.dataset.id;
        const inR  = isInRoute(id);
        btn.classList.toggle('in-route', inR);
        btn.setAttribute('aria-pressed', String(inR));
        btn.textContent = inR ? '✓ In route' : '+ Route';
      });
    });

    /* Marker-klik van map.js → selecteer kaart in lijst */
    document.addEventListener('boerenroute:markerclick', e => {
      const card = listEl()?.querySelector(`.shop-card[data-id="${e.detail.id}"]`);
      if (card) {
        listEl().querySelectorAll('.shop-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    _bound = true;
  }

  _render();
}

export function setUserLocation(lat, lng) {
  userLat = lat;
  userLng = lng;
  _located = true;
  sortBy  = 'afstand';
  const sel = $('sortSelect');
  if (sel) sel.value = 'afstand';
  document.body.classList.add('map-active');
  // Pas kaart-layout direct toe via JS (werkt altijd, ook bij terugkeer)
  import('./bottomsheet.js').then(({ activateMobileLayout }) => {
    activateMobileLayout();
  });
  _render();
}

/* Verken-modus: schakel naar de fullscreen-kaart zónder een locatie te kiezen.
   Geen echte locatie → afstand-sortering is zinloos, dus val terug op
   beoordeling, en afstandslabels worden onderdrukt (zie _cardHTML). */
export function exploreMap() {
  if (sortBy === 'afstand') {
    sortBy = 'rating';
    const sel = $('sortSelect');
    if (sel) sel.value = 'rating';
  }
  document.body.classList.add('map-active');
  import('./bottomsheet.js').then(({ activateMobileLayout }) => {
    activateMobileLayout();
  });
  _render();
}

/* Verberg type-filterchips waarvoor geen enkele locatie bestaat (bv. 'markt').
   Data-gedreven: voeg je later zo'n type toe, dan verschijnt de chip vanzelf. */
function _syncFilterChips() {
  document.querySelectorAll('#filterChips .chip[data-filter]').forEach(chip => {
    const t = chip.dataset.filter;
    if (t === 'all' || t === 'onderweg') return; // 'alles' altijd; 'onderweg' is de kids-toggle
    const has = allShops.some(s => s.type === t);
    chip.style.display = has ? '' : 'none';
    // Stond het filter op een nu-verborgen type? Val terug op 'Alles'.
    if (!has && activeFilter === t) {
      activeFilter = 'all';
      document.querySelectorAll('#filterChips .chip').forEach(c => {
        const on = c.dataset.filter === 'all';
        c.classList.toggle('chip-active', on);
        if (on) c.setAttribute('aria-pressed', 'true'); else c.removeAttribute('aria-pressed');
      });
    }
  });
}

/* ══ Controls ════════════════════════════════════════════════════ */

function _bindControls() {
  document.querySelectorAll('#filterChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#filterChips .chip').forEach(c => {
        c.classList.remove('chip-active');
        c.removeAttribute('aria-pressed');
      });
      chip.classList.add('chip-active');
      chip.setAttribute('aria-pressed', 'true');
      activeFilter = chip.dataset.filter;
      _render();
    });
  });

  $('searchInput')?.addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase().trim();
    _render();
  });

  $('sortSelect')?.addEventListener('change', e => {
    sortBy = e.target.value;
    _render();
  });

  $('openNowToggle')?.addEventListener('change', e => {
    showOpenOnly = e.target.checked;
    _render();
  });

  $('favToggle')?.addEventListener('change', e => {
    showFavOnly = e.target.checked;
    _render();
  });

  /* Kids-hint knop → activeert de 'Onderweg'-chip direct */
  document.getElementById('kidsHintBtn')?.addEventListener('click', () => {
    document.querySelector('#filterChips .chip[data-filter="onderweg"]')?.click();
  });

  /* Reset-chip → terug naar 'Alles' */
  $('chipReset')?.addEventListener('click', () => {
    document.querySelector('#filterChips .chip[data-filter="all"]')?.click();
  });
}

/* ══ Filter + sort ═══════════════════════════════════════════════ */

function _getFiltered() {
  let shops = allShops.filter(s => {
    if (activeFilter === 'all') {
      if (s.type === 'onderweg') return false;
    } else if (s.type !== activeFilter) {
      return false;
    }

    if (showFavOnly && !favorites.has(s.id)) return false;

    if (showOpenOnly) {
      const st = _isOpenNow(s.hours);
      if (st === false) return false;
    }

    if (searchQuery) {
      const q = searchQuery;
      const hit =
        s.name.toLowerCase().includes(q)                          ||
        s.address.toLowerCase().includes(q)                       ||
        (s.products || []).some(p => p.toLowerCase().includes(q)) ||
        (s.tags    || []).some(t => t.toLowerCase().includes(q))  ||
        (s.desc    || '').toLowerCase().includes(q);
      if (!hit) return false;
    }

    return true;
  });

  shops = shops.map(s => ({ ...s, _dist: _haversine(userLat, userLng, s.lat, s.lng) }));

  if (sortBy === 'naam') {
    shops.sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  } else if (sortBy === 'rating') {
    shops.sort((a, b) => (b.googleRating || 0) - (a.googleRating || 0));
  } else {
    shops.sort((a, b) => a._dist - b._dist);
  }

  shops.sort((a, b) => (b.premium ? 1 : 0) - (a.premium ? 1 : 0));

  return shops;
}

/* ══ Render ══════════════════════════════════════════════════════ */

function _render(reset = true) {
  const isLandingMobile = window.innerWidth <= 900 && !document.body.classList.contains('map-active');
  const effectiveBase   = isLandingMobile ? LANDING_LIMIT : BASE_LIMIT;
  if (reset) _limit = effectiveBase;
  const shops = _getFiltered();
  const list  = listEl();
  if (!list) return;

  const total = activeFilter === 'all'
    ? allShops.filter(s => s.type !== 'onderweg').length
    : allShops.filter(s => s.type === activeFilter).length;

  const el = countEl();
  if (el) el.textContent = `${shops.length} van ${total} locaties`;

  /* Kids-hint: toon alleen bij 'Alles', verberg bij 'Onderweg' en andere filters */
  const hint = document.getElementById('kidsHint');
  if (hint) hint.hidden = activeFilter !== 'all';

  /* Reset-chip: zichtbaar zodra er een actief filter is (niet 'all') */
  const resetChip = $('chipReset');
  if (resetChip) resetChip.hidden = (activeFilter === 'all');

  if (shops.length === 0) {
    list.innerHTML = '';
    const emp = emptyEl();
    if (emp) {
      emp.hidden = false;
      const FILTER_NAMES = {
        winkel: 'winkels', automaat: 'automaten', zelfpluk: 'zelfpluktuinen',
        markt: 'markten', onderweg: 'onderweg-plekken',
      };
      const filterLabel = FILTER_NAMES[activeFilter] ?? 'locaties';
      const isFiltered  = activeFilter !== 'all';
      const hasQuery    = !!searchQuery;
      let msg = '';
      if (hasQuery && isFiltered)
        msg = `Geen ${filterLabel} gevonden voor <em>"${_esc(searchQuery)}"</em>.`;
      else if (hasQuery)
        msg = `Niets gevonden voor <em>"${_esc(searchQuery)}"</em>.`;
      else if (isFiltered)
        msg = `Geen ${filterLabel} gevonden in je buurt.`;
      else
        msg = 'Geen locaties gevonden in je buurt.';

      const tips = [];
      if (isFiltered || hasQuery) tips.push('Wis de filters om alle locaties te zien.');
      if (!hasQuery && !isFiltered) tips.push('Probeer een andere plaats of vergroot de kaart.');
      emp.innerHTML = `${msg}${tips.length ? `<br><span>${tips.join(' ')}</span>` : ''}`;
    }
    renderMarkers([]);
    return;
  }

  const emp = emptyEl();
  if (emp) emp.hidden = true;

  /* Toon maximaal _limit kaartjes/markers tegelijk (mobiel-performance) */
  const shown   = shops.slice(0, _limit);
  const restant = shops.length - shown.length;

  let moreHTML = '';
  if (restant > 0) {
    if (isLandingMobile) {
      moreHTML = `<li class="shop-landing-nudge">
        <div class="sln-icon">📍</div>
        <div class="sln-body">
          <strong>Nog ${restant} winkels</strong> staan er in de database.
          Geef je woonplaats of locatie op en zie ze gesorteerd op afstand.
          <div class="sln-actions">
            <button class="btn btn-green btn-sm" id="slnGpsBtn">📍 Mijn locatie</button>
            <button class="btn btn-ghost btn-sm" id="slnMoreBtn">Toon toch alles</button>
          </div>
        </div>
      </li>`;
    } else {
      moreHTML = `<li class="shop-more"><button class="btn btn-ghost" id="shopMoreBtn">Toon meer (${restant} resterend)</button></li>`;
    }
  }

  list.innerHTML = shown.map(_cardHTML).join('') + moreHTML;

  /* Kaart: álle gefilterde locaties (clustering bundelt ze, dus blijft licht).
     De lijst blijft wél gepagineerd (_limit) voor een lichte DOM op mobiel. */
  renderMarkers(shops);

  document.getElementById('shopMoreBtn')?.addEventListener('click', () => {
    _limit += BASE_LIMIT;
    _render(false);
  });

  document.getElementById('slnMoreBtn')?.addEventListener('click', () => {
    _limit += BASE_LIMIT;
    _render(false);
  });

  document.getElementById('slnGpsBtn')?.addEventListener('click', () => {
    document.getElementById('locateBtn')?.click();
  });

  /* Fav-knoppen */
  list.querySelectorAll('.shop-fav').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      _toggleFav(+btn.dataset.id, btn);
    });
  });

  /* Route-knoppen */
  list.querySelectorAll('.card-route-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleStop(+btn.dataset.id);
    });
  });

  /* Kaart-klik: selectie + map */
  list.querySelectorAll('.shop-card').forEach(card => {
    card.addEventListener('click', () => _selectCard(card));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _selectCard(card); }
    });
  });
}

function _selectCard(card) {
  listEl()?.querySelectorAll('.shop-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const id   = +card.dataset.id;
  const shop = allShops.find(s => s.id === id);
  if (shop) {
    highlightMarker(id);
    flyTo(shop.lat, shop.lng, 15);
    openShopModal(shop);
  }
}

function _toggleFav(id, btn) {
  const add = !favorites.has(id);
  add ? favorites.add(id) : favorites.delete(id);
  btn.classList.toggle('is-fav', add);
  btn.innerHTML = add ? '♥' : '♡';
  btn.setAttribute('aria-pressed', String(add));
  btn.setAttribute('aria-label', add ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten');
  if (showFavOnly) _render();
}

/* ══ Card HTML ═══════════════════════════════════════════════════ */

function _cardHTML(shop) {
  const isFav      = favorites.has(shop.id);
  const openStatus = _isOpenNow(shop.hours);
  const distStr    = _formatDist(shop._dist);

  const inRoute = isInRoute(shop.id);
  const tags = (shop.tags || [])
    .map(t => `<span class="shop-tag">${_esc(t)}</span>`)
    .join('');

  const isTopRated = shop.googleRating >= 4.8 && (shop.googleReviews || 0) >= 5;

  const badges = [];
  if (shop.type === 'streekwinkel')
    badges.push('<span class="shop-badge badge-streekwinkel" title="Verkoopt producten van lokale boeren">🧺 Streekwinkel</span>');
  if (shop.premium)
    badges.push('<span class="shop-badge badge-premium">✨ Uitgelicht</span>');
  if (isTopRated)
    badges.push('<span class="shop-badge badge-toprated" title="Hoog gewaardeerd op Google">🏆 Top beoordeeld</span>');
  if (shop.dagVers)
    badges.push(`<span class="shop-badge badge-dagvers" title="${_esc(shop.dagVers)}">🌿 Vandaag vers</span>`);
  if (hasVisited(shop.id))
    badges.push('<span class="shop-badge badge-visited" title="Bezocht — stempel ontvangen">🗂️ Bezocht</span>');
  if (openStatus === true)
    badges.push('<span class="shop-badge badge-open">Nu open</span>');
  else if (openStatus === false)
    badges.push('<span class="shop-badge badge-closed">Gesloten</span>');

  const rating = shop.googleRating
    ? `<span class="shop-rating" title="${shop.googleRating.toFixed(1)} sterren op Google${
        shop.googleReviews ? ` op basis van ${shop.googleReviews} beoordelingen` : ''
      }">${_stars(shop.googleRating)} <strong>${shop.googleRating.toFixed(1)}</strong>${
        shop.googleReviews
          ? `<span class="shop-reviews">&thinsp;(${shop.googleReviews})</span>`
          : ''
      }</span>`
    : '';

  return `
<li class="shop-card" data-id="${shop.id}" tabindex="0">
  <button class="shop-fav${isFav ? ' is-fav' : ''}" data-id="${shop.id}"
    aria-pressed="${isFav}"
    aria-label="${isFav ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}"
  >${isFav ? '♥' : '♡'}</button>
  <div class="shop-card-header">
    <span class="shop-emoji" aria-hidden="true">${shopIcon(shop, { size: 26 })}</span>
    <div class="shop-info">
      <div class="shop-name">${_esc(shop.name)}</div>
      <div class="shop-address">${_esc(shop.address)}</div>
    </div>
  </div>
  <div class="shop-meta">
    ${tags}${badges.join('')}${rating}
    ${_located ? `<span class="shop-dist" aria-label="${distStr} van jouw locatie">${distStr}</span>` : ''}
  </div>
  <button class="card-route-btn${inRoute ? ' in-route' : ''}" data-id="${shop.id}"
    aria-pressed="${inRoute}"
    aria-label="${inRoute ? 'Verwijder uit route' : 'Voeg toe aan route'}"
  >${inRoute ? '✓ In route' : '+ Route'}</button>
</li>`.trim();
}

/* ══ "Nu open" parser ════════════════════════════════════════════ */

const DAY_NL = { ma:1, di:2, wo:3, do:4, vr:5, za:6, zo:0 };

function _parseMins(s) {
  const [h, m = '0'] = s.replace('u', '').trim().split(/[.,]/);
  return +h * 60 + +m;
}

function _isOpenNow(hours) {
  if (!hours) return null;
  if (/bel|mail|afspraak|\?/i.test(hours)) return null;

  const now   = new Date();
  const today = now.getDay();
  const mins  = now.getHours() * 60 + now.getMinutes();

  for (const seg of hours.split(/[·•]/).map(s => s.trim()).filter(Boolean)) {
    const tm = seg.match(/(\d+(?:[.,]\d+)?)\s*[–\-]\s*(\d+(?:[.,]\d+)?)u/);
    if (!tm) continue;

    const open  = _parseMins(tm[1]);
    const close = _parseMins(tm[2]);
    const dayPart = seg.slice(0, seg.indexOf(tm[0])).trim().toLowerCase();

    if (!dayPart || /dagelijks|^ma[–\-]zo$/.test(dayPart)) {
      if (mins >= open && mins < close) return true;
      continue;
    }

    const rm = dayPart.match(/^([a-z]{2})\s*[–\-]\s*([a-z]{2})$/);
    if (rm) {
      const s = DAY_NL[rm[1]], e = DAY_NL[rm[2]];
      if (s == null || e == null) continue;
      const inRange = s <= e ? today >= s && today <= e : today >= s || today <= e;
      if (inRange && mins >= open && mins < close) return true;
      continue;
    }

    const dayNums = (dayPart.match(/[a-z]{2}/g) || [])
      .map(d => DAY_NL[d]).filter(n => n != null);
    if (dayNums.includes(today) && mins >= open && mins < close) return true;
  }

  return false;
}

/* ══ Hulpfuncties ════════════════════════════════════════════════ */

function _haversine(lat1, lng1, lat2, lng2) {
  const R   = 6371;
  const dLa = (lat2 - lat1) * Math.PI / 180;
  const dLo = (lng2 - lng1) * Math.PI / 180;
  const a   = Math.sin(dLa / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function _formatDist(km) {
  if (km < 1)  return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/* Sterren-weergave: vol / half / leeg op basis van rating (0–5) */
function _stars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let out = '';
  for (let i = 0; i < 5; i++) {
    if (i < full)            out += '<span class="star star-full">★</span>';
    else if (i === full && half) out += '<span class="star star-half">★</span>';
    else                     out += '<span class="star star-empty">★</span>';
  }
  return `<span class="star-row" aria-hidden="true">${out}</span>`;
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
