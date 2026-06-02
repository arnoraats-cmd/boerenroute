/* ═══════════════════════════════════════════════════════════════
   shops.js — winkellijst: filteren, sorteren, renderen
   ═══════════════════════════════════════════════════════════════ */

import { renderMarkers, highlightMarker, flyTo } from './map.js';
import { toggleStop, isInRoute } from './route.js';
import { openShopModal } from './modals.js';

/* ── State ──────────────────────────────────────────────────── */
let allShops     = [];
let userLat      = 51.6606;
let userLng      = 5.6188;
let activeFilter = 'all';
let searchQuery  = '';
let sortBy       = 'naam';
let showOpenOnly = false;
let showFavOnly  = false;
const favorites  = new Set();

/* ── DOM ────────────────────────────────────────────────────── */
const $       = id => document.getElementById(id);
const listEl  = () => $('shopList');
const countEl = () => $('listCount');
const emptyEl = () => $('listEmpty');

/* ══ Publiek API ════════════════════════════════════════════════ */

export function initShops(shops) {
  allShops = shops;
  _bindControls();

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

  _render();
}

export function setUserLocation(lat, lng) {
  userLat = lat;
  userLng = lng;
  sortBy  = 'afstand'; // automatisch op afstand sorteren na locatie-keuze
  const sel = $('sortSelect');
  if (sel) sel.value = 'afstand';
  _render();
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

function _render() {
  const shops = _getFiltered();
  const list  = listEl();
  if (!list) return;

  const total = activeFilter === 'all'
    ? allShops.filter(s => s.type !== 'onderweg').length
    : allShops.filter(s => s.type === activeFilter).length;

  const el = countEl();
  if (el) el.textContent = `${shops.length} van ${total} locaties`;

  if (shops.length === 0) {
    list.innerHTML = '';
    const emp = emptyEl();
    if (emp) emp.hidden = false;
    renderMarkers([]);
    return;
  }

  const emp = emptyEl();
  if (emp) emp.hidden = true;

  list.innerHTML = shops.map(_cardHTML).join('');

  /* Kaart: markers bijwerken */
  renderMarkers(shops);

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

  const badges = [];
  if (shop.premium)
    badges.push('<span class="shop-badge badge-premium">✨ Uitgelicht</span>');
  if (shop.dagVers)
    badges.push(`<span class="shop-badge badge-dagvers" title="${_esc(shop.dagVers)}">🌿 Vandaag vers</span>`);
  if (openStatus === true)
    badges.push('<span class="shop-badge badge-open">Nu open</span>');
  else if (openStatus === false)
    badges.push('<span class="shop-badge badge-closed">Gesloten</span>');

  const rating = shop.googleRating
    ? `<span class="shop-rating">⭐ ${shop.googleRating.toFixed(1)}${
        shop.googleReviews
          ? `<span class="shop-reviews">&thinsp;(${shop.googleReviews})</span>`
          : ''
      }</span>`
    : '';

  return `
<li class="shop-card" data-id="${shop.id}" role="button" tabindex="0"
    aria-label="${_esc(shop.name)}, ${_esc(shop.address)}">
  <button class="shop-fav${isFav ? ' is-fav' : ''}" data-id="${shop.id}"
    aria-pressed="${isFav}"
    aria-label="${isFav ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}"
  >${isFav ? '♥' : '♡'}</button>
  <div class="shop-card-header">
    <span class="shop-emoji" aria-hidden="true">${shop.emoji}</span>
    <div class="shop-info">
      <div class="shop-name">${_esc(shop.name)}</div>
      <div class="shop-address">${_esc(shop.address)}</div>
    </div>
  </div>
  <div class="shop-meta">
    ${tags}${badges.join('')}${rating}
    <span class="shop-dist" aria-label="${distStr} van jouw locatie">${distStr}</span>
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

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
