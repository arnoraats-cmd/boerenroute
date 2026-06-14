/* ═══════════════════════════════════════════════════════════════
   route.js — stops beheren, nearest-neighbour optimalisatie,
               GPX-export, Google Maps, delen
   ═══════════════════════════════════════════════════════════════ */

import { drawRoute, setRouteMarkers } from './map.js';
import { shopIcon } from './icons.js';
import { fmtDuration } from './routeScore.js';
import { getGPS } from './location.js';

/* ── State ──────────────────────────────────────────────────── */
const START_ID = '__mijn-locatie__';   // synthetisch startpunt (geen winkel)
let _stops  = [];    // shop-objecten in volgorde (eventueel met startpunt vooraan)
let _allRef = [];    // referentie naar de volledige dataset

/* ══ Init ════════════════════════════════════════════════════════ */

let _bound = false;

export function initRoute(allShops) {
  _allRef = allShops;
  /* Panel-listeners maar één keer binden (initRoute draait opnieuw bij OSM-toevoeging) */
  if (!_bound) { _bindPanel(); _bound = true; }
  _renderPanel();
}

/* ══ Publiek API ════════════════════════════════════════════════ */

/* shop (optioneel) = het volledige winkel-object. Meegeven maakt toevoegen
   onafhankelijk van _allRef (bv. vóór locatiekeuze of bij OSM-winkels). */
export function toggleStop(shopId, shop) {
  isInRoute(shopId) ? _remove(shopId) : _add(shopId, shop);
}

export function isInRoute(shopId) {
  return _stops.some(s => s.id === shopId);
}

export function getStops()   { return [..._stops]; }
export function getCount()   { return _stops.length; }
export function clearRoute() { _clear(); }

/* Zet een volledige route ineens (bv. gecureerde maand-route).
   optimize:false bewaart de aangeleverde volgorde (gecureerd);
   true laat de lus-ordening los op de stops. */
export function loadStops(shops, { optimize = false } = {}) {
  const seen = new Set();
  _stops = shops
    .map(s => (typeof s === 'object' ? s : _allRef.find(x => x.id === s)))
    .filter(s => s && !seen.has(s.id) && seen.add(s.id));
  if (optimize) _stops = _optimizeOrder(_stops, _stops[0]);
  _sync();
}

/* Zet (of vervang) een startpunt op de huidige GPS-locatie. De route begint
   dan bij jou en sluit als lus weer daar terug — een rondrit van huis. */
export async function startFromMyLocation() {
  const btn = document.getElementById('startHereBtn');
  if (btn) { btn.disabled = true; btn.dataset.busy = '1'; }
  try {
    const { lat, lng } = await getGPS();
    const start = {
      id: START_ID, name: 'Mijn startpunt', address: 'Jouw GPS-locatie',
      lat, lng, _start: true,
    };
    const shops = _stops.filter(s => !s._start);     // bestaand startpunt vervangen
    _stops = [start, ...shops];
    if (_stops.length >= 3) _stops = _optimizeOrder(_stops, start);
    _sync();
    _toast('📍 Startpunt op jouw locatie gezet');
  } catch (e) {
    _toast(`📍 ${e.message}`);
  } finally {
    if (btn) { btn.disabled = false; delete btn.dataset.busy; }
  }
}

function _removeStart() {
  _stops = _stops.filter(s => !s._start);
  _sync();
}

/* ══ Interne mutaties ════════════════════════════════════════════ */

function _add(shopId, provided) {
  const shop = _allRef.find(s => s.id === shopId) || provided;
  if (!shop || isInRoute(shopId)) return;
  const start = _stops[0] || shop;          // behoud het eerste punt als start van de lus
  _stops.push(shop);
  /* Auto-lus-ordening zodra er een ronde te maken is (handmatig + boodschappenlijst) */
  if (_stops.length >= 3) _stops = _optimizeOrder(_stops, start);
  _sync();
  /* Subtiele bevestiging; de zwevende balk toont de telling + route-actie */
  _toast(`✓ ${shop.name} toegevoegd`);
}

function _remove(shopId) {
  _stops = _stops.filter(s => s.id !== shopId);
  _sync();
}

function _clear() {
  _stops = [];
  _sync();
}

function _optimize() {
  if (_stops.length < 3) return;
  _stops = _optimizeOrder(_stops, _stops[0]);
  _sync();
}

/* Stuur veranderingen door naar kaart + panel */
function _sync() {
  drawRoute(_stops);
  setRouteMarkers(_stops);
  _renderPanel();
  _updateBadge();
  _updateFab();
  /* Informeer shops.js zodat kaart-knoppen updaten */
  document.dispatchEvent(new CustomEvent('boerenroute:routechange'));
}

/* ══ Panel-binding ═══════════════════════════════════════════════ */

function _bindPanel() {
  document.getElementById('clearRouteBtn')?.addEventListener('click', _clear);
  document.getElementById('optimizeBtn')?.addEventListener('click', _optimize);
  document.getElementById('startHereBtn')?.addEventListener('click', startFromMyLocation);
  document.getElementById('gpxBtn')?.addEventListener('click', _downloadGPX);
  document.getElementById('shareBtn')?.addEventListener('click', _share);

  /* Zwevende balk → naar het routepaneel */
  document.getElementById('routeFab')?.addEventListener('click', () => {
    document.querySelector('.nav-btn[data-page="route"]')?.click();
  });

  /* Recreatieve metrics ontvangen (echte wegafstand + belevingsscore enz.) */
  document.addEventListener('boerenroute:routestats', e => {
    const distEl = document.getElementById('routeTotalDist');
    if (distEl && _stops.length >= 2) {
      distEl.textContent = `${_fmt(e.detail.km)} totaal`;
    }
    _renderStats(e.detail);
  });
}

/* ══ Panel renderen ══════════════════════════════════════════════ */

function _renderPanel() {
  const stopsEl   = document.getElementById('routeStops');
  const emptyEl   = document.getElementById('routeEmpty');
  const actionsEl = document.getElementById('routeActions');
  const metaEl    = document.getElementById('routeMeta');
  const mapsLink  = document.getElementById('mapsLink');
  if (!stopsEl) return;

  const hasStops = _stops.length > 0;
  if (emptyEl)   emptyEl.hidden   = hasStops;
  if (actionsEl) actionsEl.hidden = !hasStops;
  if (metaEl)    metaEl.hidden    = !hasStops;

  /* Stats-balk pas tonen bij een echte route (≥2 stops); anders leegmaken */
  const statsEl = document.getElementById('routeStats');
  if (statsEl && _stops.length < 2) { statsEl.hidden = true; statsEl.innerHTML = ''; }

  if (!hasStops) { stopsEl.innerHTML = ''; return; }

  /* Bereken afstanden per etappe */
  let totalKm = 0;
  const legs  = _stops.map((shop, i) => {
    if (i === 0) return { shop, leg: null };
    const d = _haversine(_stops[i-1].lat, _stops[i-1].lng, shop.lat, shop.lng);
    totalKm += d;
    return { shop, leg: d };
  });

  /* Toon totaal */
  const distEl = document.getElementById('routeTotalDist');
  if (distEl) distEl.textContent = `${_fmt(totalKm)} totaal`;

  /* Navigatie-link bijwerken: Google Maps kapt na 10 stops af, dus lange routes gaan naar Komoot. */
  if (mapsLink) {
    const usesKomoot = _usesKomootFallback(_stops);
    mapsLink.href = _navUrl(_stops);
    mapsLink.setAttribute(
      'aria-label',
      usesKomoot
        ? 'Open route in Komoot met alle stops'
        : 'Start route in Google Maps op de fiets'
    );
    const txt = mapsLink.querySelector('.route-nav-txt');
    if (txt) {
      txt.innerHTML = usesKomoot
        ? 'Open in Komoot<span class="route-nav-sub">alle stops mee naar de planner</span>'
        : 'Start route<span class="route-nav-sub">navigeer op de fiets · Google Maps</span>';
    }
  }

  /* Stop-items — het startpunt (📍) krijgt geen nummer; winkels tellen 1..n */
  let num = 0;
  stopsEl.innerHTML = legs.map(({ shop, leg }) => {
    const isStart = shop._start;
    const badge   = isStart ? '📍' : `${++num}`;
    const emoji   = isStart ? '📍' : shopIcon(shop, { size: 20 });
    const rm = isStart
      ? `<button class="stop-rm" data-start="1" aria-label="Verwijder startpunt">✕</button>`
      : `<button class="stop-rm" data-id="${shop.id}" aria-label="Verwijder ${_esc(shop.name)} uit route">✕</button>`;
    return `
<li class="route-stop${isStart ? ' route-stop-start' : ''}"${isStart ? '' : ` data-id="${shop.id}"`}>
  <span class="stop-num">${badge}</span>
  <span class="stop-emoji">${emoji}</span>
  <div class="stop-info">
    <div class="stop-name">${_esc(shop.name)}</div>
    <div class="stop-addr">${_esc(shop.address)}</div>
    ${leg ? `<div class="stop-leg">← ${_fmt(leg)}</div>` : ''}
  </div>
  ${rm}
</li>`;
  }).join('');

  stopsEl.querySelectorAll('.stop-rm').forEach(btn =>
    btn.addEventListener('click', () =>
      btn.dataset.start ? _removeStart() : _remove(+btn.dataset.id)
    )
  );
}

function _updateBadge() {
  const n = _stops.length;
  for (const id of ['routeBadge', 'bnRouteBadge']) {
    const el = document.getElementById(id);
    if (el) { el.textContent = n; el.hidden = n === 0; }
  }
}

/* Zwevende "route klaar"-balk bijwerken (CSS verbergt 'm op de route-tab zelf) */
function _updateFab() {
  const fab = document.getElementById('routeFab');
  if (!fab) return;
  const countEl = document.getElementById('routeFabCount');
  if (countEl) countEl.textContent = _stops.length;
  fab.hidden = _stops.length === 0;
}

/* Recreatieve metrics-chips in het routepaneel */
function _renderStats(stats) {
  const el = document.getElementById('routeStats');
  if (!el) return;
  if (!stats || _stops.length < 2) { el.hidden = true; el.innerHTML = ''; return; }

  const chips = [];
  if (stats.score != null)
    chips.push(`<button type="button" class="rstat rstat-score" id="rstatScoreBtn" aria-expanded="false" aria-controls="rstatInfo">⭐ ${stats.score}<small>/100</small><span class="rstat-i" aria-hidden="true">ⓘ</span></button>`);
  chips.push(`<span class="rstat" title="Verwachte duur incl. winkelstops">🕐 ${fmtDuration(stats.durationMin)}</span>`);
  chips.push(`<span class="rstat" title="Route-moeilijkheid">📊 ${stats.difficulty}</span>`);
  if (stats.pctQuiet != null)
    chips.push(`<span class="rstat" title="Aandeel autoluwe wegen">🌿 ${Math.round(stats.pctQuiet * 100)}% autoluw</span>`);
  if (stats.family)
    chips.push('<span class="rstat rstat-family" title="Kort, vlak, verhard en autoluw">👪 Gezinsvriendelijk</span>');

  /* Uitklap-uitleg bij de belevingsscore (tap-vriendelijk i.p.v. tooltip) */
  let info = '';
  if (stats.score != null) {
    const pct = v => v == null ? '–' : Math.round(v * 100) + '%';
    info = `<div class="rstat-info" id="rstatInfo" hidden>
      <p class="rstat-info-lead"><strong>Belevingsscore ${stats.score}/100</strong> — hoe prettig deze route fietst. Hoe hoger, hoe rustiger en mooier.</p>
      <ul class="rstat-info-list">
        <li><span>🌿 Autoluwe wegen</span><strong>${pct(stats.pctQuiet)}</strong></li>
        <li><span>🔗 Fietsknooppunten-netwerk</span><strong>${pct(stats.pctNetwork)}</strong></li>
        <li><span>🛣️ Verhard pad</span><strong>${pct(stats.pctPaved)}</strong></li>
      </ul>
      <p class="rstat-info-foot">Automatisch berekend uit de échte wegen in de route.</p>
    </div>`;
  }

  el.innerHTML = chips.join('') + info;
  el.hidden = false;

  const btn = document.getElementById('rstatScoreBtn');
  const panel = document.getElementById('rstatInfo');
  btn?.addEventListener('click', () => {
    const opening = panel.hidden;
    panel.hidden = !opening;
    btn.setAttribute('aria-expanded', String(opening));
  });
}

/* Korte, niet-opdringerige bevestiging onderaan het scherm */
let _toastTimer = null;
function _toast(msg) {
  let t = document.getElementById('brToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'brToast';
    t.className = 'br-toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    document.body.appendChild(t);
  }
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add('br-toast-show'));
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('br-toast-show'), 2400);
}

/* ══ Lus-optimalisatie: hoekordening + 2-opt ═════════════════════
   Greedy nearest-neighbour maakt juist kruisingen/terugslag. Voor een
   cirkelroute werkt: (1) sorteer op poolhoek rond het zwaartepunt → een
   niet-kruisende ronde, (2) 2-opt op de gesloten lus tegen restkruisingen,
   (3) roteer zodat de oorspronkelijke startwinkel weer vooraan staat. */

function _optimizeOrder(shops, startShop) {
  if (shops.length < 3) return shops;
  let order = _twoOpt(_angularOrder(shops));
  const i = startShop ? order.findIndex(s => s.id === startShop.id) : 0;
  if (i > 0) order = [...order.slice(i), ...order.slice(0, i)];
  return order;
}

/* Zelfde lus-ordening, herbruikbaar (bv. om de afstand vooraf te meten) */
export function orderLoop(shops, startShop = shops[0]) {
  return _optimizeOrder(shops, startShop);
}

function _angularOrder(shops) {
  const cx = shops.reduce((a, s) => a + s.lng, 0) / shops.length;
  const cy = shops.reduce((a, s) => a + s.lat, 0) / shops.length;
  return [...shops].sort((a, b) =>
    Math.atan2(a.lat - cy, a.lng - cx) - Math.atan2(b.lat - cy, b.lng - cx)
  );
}

/* 2-opt op een GESLOTEN lus (edge n-1 → 0 telt mee). n is klein (≤ ~12). */
function _twoOpt(order) {
  const n = order.length;
  const d = (a, b) => _haversine(a.lat, a.lng, b.lat, b.lng);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const a = order[(i - 1 + n) % n], b = order[i];
        const c = order[k],               e = order[(k + 1) % n];
        if (a === c || b === e) continue;
        if (d(a, c) + d(b, e) + 1e-9 < d(a, b) + d(c, e)) {
          order = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)];
          improved = true;
        }
      }
    }
  }
  return order;
}

/* ══ Export ══════════════════════════════════════════════════════ */

function _downloadGPX() {
  if (!_stops.length) return;
  const now  = new Date().toISOString();
  const wpts = _stops.map(s => `
  <wpt lat="${s.lat}" lon="${s.lng}">
    <name>${_esc(s.name)}</name>
    <desc>${_esc(s.address)}${s.hours ? ' · ' + _esc(s.hours) : ''}</desc>
  </wpt>`).join('');

  const rtepts = _stops.map((s, i) => `
    <rtept lat="${s.lat}" lon="${s.lng}">
      <name>${i + 1}. ${_esc(s.name)}</name>
    </rtept>`).join('');

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Boerenroute.nl"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata><name>Boerenroute</name><time>${now}</time></metadata>
${wpts}
  <rte>
    <name>Boerenroute ${new Date().toLocaleDateString('nl-NL')}</name>
${rtepts}
  </rte>
</gpx>`;

  const blob = new Blob([gpx], { type: 'application/gpx+xml' });
  const a    = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(blob),
    download: `boerenroute-${Date.now()}.gpx`,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);

  _showGpxTip();
}

/* Affiliate-tip na GPX-download: één keer per sessie tonen */
function _showGpxTip() {
  if (sessionStorage.getItem('br_gpxtip')) return;
  sessionStorage.setItem('br_gpxtip', '1');

  const existing = document.getElementById('gpxAffiliateTip');
  if (existing) { existing.hidden = false; return; }

  const AFFILIATE_URL = 'https://partner.bol.com/click/click?p=2&t=url&s=1526050&f=TXL&url=https%3A%2F%2Fwww.bol.com%2Fnl%2Fnl%2Fs%2F%3Fsearchtext%3Dedge%20garmin&name=Bol';

  const tip = document.createElement('div');
  tip.id        = 'gpxAffiliateTip';
  tip.className = 'gpx-tip';
  tip.innerHTML = `
    <span class="gpx-tip-icon">🚴</span>
    <span class="gpx-tip-text">GPX werkt op elke Garmin Edge — <a href="${AFFILIATE_URL}" target="_blank" rel="noopener sponsored" class="gpx-tip-link">bekijk fietscomputers op Bol.com →</a></span>
    <button class="gpx-tip-close" aria-label="Sluit tip">×</button>`;
  tip.querySelector('.gpx-tip-close').addEventListener('click', () => tip.remove());

  const btn = document.getElementById('gpxBtn');
  btn?.insertAdjacentElement('afterend', tip);
}

function _navUrl(stops) {
  return _usesKomootFallback(stops) ? _komootUrl(stops) : _mapsUrl(stops);
}

function _usesKomootFallback(stops) {
  return stops.length > 10;
}

function _mapsUrl(stops) {
  if (!stops.length) return '#';
  const MAX = 10; // Google Maps-limiet
  const pts = stops.slice(0, MAX);
  const origin = `${pts[0].lat},${pts[0].lng}`;
  const dest   = `${pts[pts.length - 1].lat},${pts[pts.length - 1].lng}`;
  const wps    = pts.slice(1, -1).map(s => `${s.lat},${s.lng}`).join('|');
  const params = new URLSearchParams({
    api: '1', origin, destination: dest, travelmode: 'bicycling',
  });
  if (wps) params.set('waypoints', wps);
  return `https://www.google.com/maps/dir/?${params}`;
}

function _komootUrl(stops) {
  if (!stops.length) return 'https://www.komoot.com/plan';
  const start = stops[0];
  const params = new URLSearchParams({ sport: 'touringbicycle' });
  stops.forEach(s => params.append('waypoint', `${s.lat},${s.lng}`));
  return `https://www.komoot.com/plan/@${start.lat},${start.lng},12z?${params}`;
}

async function _share() {
  const url  = _navUrl(_stops);
  const text = `Mijn Boerenroute langs ${_stops.length} stop${_stops.length !== 1 ? 's' : ''}:\n`
    + _stops.map((s, i) => `${i + 1}. ${s.name} — ${s.address}`).join('\n');

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Boerenroute', text, url });
      return;
    } catch { /* viel terug op WhatsApp */ }
  }
  window.open(
    `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`,
    '_blank', 'noopener'
  );
}

/* ══ Hulpfuncties ════════════════════════════════════════════════ */

function _haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, dL = (lat2-lat1)*Math.PI/180, dG = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dL/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dG/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function _fmt(km) {
  if (km < 1)  return `${Math.round(km*1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function _esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
