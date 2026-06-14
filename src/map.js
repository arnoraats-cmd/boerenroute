/* ═══════════════════════════════════════════════════════════════
   map.js — Leaflet-kaart met gekleurde markers per type
   Leaflet geladen als global `L` via CDN in index.html
   ═══════════════════════════════════════════════════════════════ */

import { shopIcon } from './icons.js';
import { routeVia } from './routing.js';
import { analyzeRoute } from './routeScore.js';
import { toggleStop, isInRoute } from './route.js';

/* Kleuren per type (zie CLAUDE.md) */
const COLOR = {
  winkel:      '#64748B', // grijs
  automaat:    '#2563EB', // blauw
  zelfpluk:    '#E11D48', // aardbei-rood
  markt:       '#92400E', // bruin
  onderweg:    '#7C3AED', // paars
  streekwinkel:'#B8720F', // amber/goud — betaald commercieel segment
  route:       '#3B6D11', // groen (in route)
};

/* Volgorde + labels voor de kaartlegenda */
const LEGEND = [
  ['winkel',      'Winkel'],
  ['automaat',    'Automaat'],
  ['zelfpluk',    'Zelfpluk'],
  ['markt',       'Markt'],
  ['streekwinkel','Streekwinkel'],
  ['onderweg',    'Onderweg'],
  ['route',       'In route'],
];

let _map        = null;
let _group      = null;
let _routeLine  = null;
let _routeNums  = new Map(); // id → routenummer (1-based)
const _data     = new Map(); // id → { marker, shop }
let _hl         = null;      // id van huidig uitgelicht marker
let _drawVer    = 0;         // versieteller om stale OSRM-responses te negeren

/* ══ Init ════════════════════════════════════════════════════════ */

export function initMap({ lat = 51.6606, lng = 5.6188, zoom = 11 } = {}) {
  document.querySelector('#map .map-placeholder')?.remove();

  _map = L.map('map', {
    center: [lat, lng],
    zoom,
    zoomControl: false,
    attributionControl: true,
  });

  L.control.zoom({ position: 'bottomright' }).addTo(_map);

  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
      detectRetina: true,
    }
  ).addTo(_map);

  /* Clustering van 1.600+ markers. Bij uitzoomen bundelen we ze tot leesbare
     groene clusters; vanaf zoom 13 (stad/dorp) tonen we weer losse pins, zodat
     route-nummers en selectie zichtbaar blijven. Plugin niet geladen? → losse markers. */
  _group = (typeof L.markerClusterGroup === 'function'
    ? L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 13,
        maxClusterRadius: 55,
        chunkedLoading: true,
        iconCreateFunction: _clusterIcon,
      })
    : L.layerGroup()
  ).addTo(_map);

  _addLegend();

  /* Wijzigt de route ergens anders (lijst/paneel) terwijl een popup openstaat?
     Werk dan de knop in die open popup bij. */
  document.addEventListener('boerenroute:routechange', () => {
    const btn = document.querySelector('.leaflet-popup .popup-route-btn');
    if (btn) _syncPopupRouteBtn(btn);
  });
}

/* Kaartlegenda — inklapbaar (standaard ingeklapt op smal scherm) */
let _legendBody = null;

function _fillLegend(types) {
  if (!_legendBody) return;
  // 'route' (in route) toont altijd; overige types alleen als ze in de data zitten
  const items = LEGEND.filter(([k]) => k === 'route' || !types || types.has(k));
  _legendBody.innerHTML = items
    .map(([k, label]) => `<li><span class="map-legend-dot" style="background:${COLOR[k]}"></span>${label}</li>`)
    .join('');
}

/* Verfijn de legenda tot de types die echt op de kaart voorkomen (bv. 'markt' weglaten) */
export function setLegendTypes(types) {
  _fillLegend(types);
}

function _addLegend() {
  const ctrl = L.control({ position: 'bottomleft' });
  ctrl.onAdd = () => {
    const div = L.DomUtil.create('div', 'map-legend');
    div.innerHTML =
      `<button class="map-legend-toggle" type="button" aria-expanded="true">`
      + `<span class="map-legend-title">Legenda</span>`
      + `<span class="map-legend-chevron" aria-hidden="true">▾</span></button>`
      + `<ul class="map-legend-body"></ul>`;
    _legendBody = div.querySelector('.map-legend-body');
    _fillLegend(null); // alle types tot setLegendTypes verfijnt

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    const btn = div.querySelector('.map-legend-toggle');
    btn.addEventListener('click', () => {
      const collapsed = div.classList.toggle('collapsed');
      btn.setAttribute('aria-expanded', String(!collapsed));
    });
    if (window.matchMedia('(max-width: 640px)').matches) {
      div.classList.add('collapsed');
      btn.setAttribute('aria-expanded', 'false');
    }
    return div;
  };
  ctrl.addTo(_map);
}

/* Groene cluster-bubbel in de huisstijl, met het aantal locaties erin */
function _clusterIcon(cluster) {
  const n = cluster.getChildCount();
  const s = n < 10 ? 32 : n < 50 ? 38 : n < 200 ? 44 : 50;
  return L.divIcon({
    className: 'br-cluster',
    html: `<div style="width:${s}px;height:${s}px;display:flex;align-items:center;justify-content:center;`
      + `background:radial-gradient(circle at 32% 28%, #5E9420, #356611);color:#fff;font-weight:700;`
      + `font-family:system-ui,sans-serif;font-size:${n > 99 ? 13 : 14}px;border-radius:50%;`
      + `border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)">${n}</div>`,
    iconSize: [s, s],
  });
}

/* ══ Markers ════════════════════════════════════════════════════ */

export function renderMarkers(shops) {
  if (!_map || !_group) return;

  _group.clearLayers();
  _data.clear();
  _hl = null;

  const markers = [];
  shops.forEach(shop => {
    const marker = L.marker([shop.lat, shop.lng], {
      icon: _icon(shop, false),
      title: shop.name,
      riseOnHover: true,
    });

    /* Functie i.p.v. string: zo wordt de route-status (in route / niet) elke
       keer dat de popup opent vers berekend, met de knop-listener er direct op. */
    marker.bindPopup(() => _popupNode(shop), {
      maxWidth: 248,
      className: 'br-popup',
      closeButton: false,
      offset: L.point(0, -4),
    });

    marker.on('click', () => {
      highlightMarker(shop.id);
      document.dispatchEvent(
        new CustomEvent('boerenroute:markerclick', { detail: { id: shop.id } })
      );
    });

    markers.push(marker);
    _data.set(shop.id, { marker, shop });
  });

  // Bulk toevoegen (sneller bij clustering); layerGroup-terugval heeft geen addLayers
  if (typeof _group.addLayers === 'function') _group.addLayers(markers);
  else markers.forEach(m => _group.addLayer(m));
}

/* ══ Uitlichten ══════════════════════════════════════════════════ */

export function highlightMarker(id) {
  if (_hl != null && _data.has(_hl)) {
    const { marker, shop } = _data.get(_hl);
    marker.setIcon(_icon(shop, false, _routeNums.get(shop.id) ?? null));
    if (_hl !== id) marker.closePopup();
  }
  _hl = id;
  if (id != null && _data.has(id)) {
    const { marker, shop } = _data.get(id);
    marker.setIcon(_icon(shop, true, _routeNums.get(shop.id) ?? null));
    // Zit de marker in een cluster (uitgezoomd)? Eerst uitvouwen/inzoomen, dán popup.
    if (typeof _group.zoomToShowLayer === 'function' && _group.hasLayer(marker)) {
      _group.zoomToShowLayer(marker, () => marker.openPopup());
    } else {
      marker.openPopup();
    }
  }
}

/* ══ Bewegen ════════════════════════════════════════════════════ */

export function flyTo(lat, lng, zoom = 15) {
  _map?.flyTo([lat, lng], zoom, { duration: 1.0, easeLinearity: 0.35 });
}

export function setView(lat, lng, zoom = 11) {
  _map?.setView([lat, lng], zoom);
}

export function invalidateSize() {
  _map?.invalidateSize();
}

/* ══ Route-polyline ═════════════════════════════════════════════ */

export async function drawRoute(stops) {
  if (_routeLine) { _routeLine.remove(); _routeLine = null; }
  if (stops.length < 2 || !_map) return;

  const ver = ++_drawVer;

  /* Sluit de lus: keer terug naar de eerste stop → cirkelroute i.p.v. heen-en-weer */
  const points = stops.map(s => ({ lat: s.lat, lng: s.lng }));
  points.push({ lat: stops[0].lat, lng: stops[0].lng });

  const result = await routeVia(points, { profile: 'trekking' });
  if (ver !== _drawVer) return; // nieuwere aanvraag onderweg, negeer

  if (result?.geometry) {
    _routeLine = L.geoJSON(result.geometry, {
      style: { color: '#3B6D11', weight: 5, opacity: .9, lineJoin: 'round', lineCap: 'round' },
    }).addTo(_map);
    _map.fitBounds(_routeLine.getBounds(), { padding: [48, 48], maxZoom: 14 });

    /* Recreatieve metrics afleiden en naar het routepaneel sturen */
    const stats = analyzeRoute({
      distanceKm:   result.distanceKm,
      ascendM:      result.ascendM,
      totalTimeSec: result.totalTimeSec,
      messages:     result.messages,
      stopCount:    stops.length,
    });
    document.dispatchEvent(new CustomEvent('boerenroute:routestats', {
      detail: { ...stats, km: result.distanceKm, engine: result.engine },
    }));
  } else {
    _drawFallback(stops);
  }
}

function _drawFallback(stops) {
  const pts = stops.map(s => [s.lat, s.lng]);
  if (stops.length >= 2) pts.push([stops[0].lat, stops[0].lng]); // lus sluiten
  _routeLine = L.polyline(
    pts,
    { color: '#3B6D11', weight: 4, opacity: .6, dashArray: '10 8', lineJoin: 'round' }
  ).addTo(_map);
}

/* Zet markers voor route-stops op genummerde iconen. Een eventueel startpunt
   (_start) telt niet mee in de nummering en krijgt een eigen 📍-marker. */
export function setRouteMarkers(stops) {
  if (!_map) return;
  _routeNums.clear();
  let n = 0;
  let startStop = null;
  for (const s of stops) {
    if (s._start) { startStop = s; continue; }
    _routeNums.set(s.id, ++n);
  }
  _setStartMarker(startStop);

  // Herrender alle zichtbare markers
  _data.forEach(({ marker, shop }) => {
    const num = _routeNums.get(shop.id) ?? null;
    const hl  = _hl === shop.id;
    marker.setIcon(_icon(shop, hl, num));
  });
}

/* Eigen marker voor het GPS-startpunt (geen winkel, dus niet in _data). */
let _startMarker = null;
function _setStartMarker(startStop) {
  if (_startMarker) { _startMarker.remove(); _startMarker = null; }
  if (!startStop || !_map) return;
  _startMarker = L.marker([startStop.lat, startStop.lng], {
    icon: L.divIcon({
      className: '',
      html: '<div class="route-start-pin" aria-hidden="true">📍</div>',
      iconSize:   [32, 32],
      iconAnchor: [16, 30],
    }),
    interactive: false,
    keyboard:    false,
    zIndexOffset: 1000,
  }).addTo(_map);
}

/* ══ Marker-icoon ════════════════════════════════════════════════ */

/* Pin in de vorm van het logo-merk (druppel), gekleurd per type met de
   witte glyph in de bol. Het punt onderaan wijst exact naar de locatie. */
function _icon(shop, hl, routeNum = null) {
  const bg  = routeNum ? COLOR.route : (COLOR[shop.type] || COLOR.route);
  const w   = (hl || routeNum) ? 36 : 28;
  const h   = Math.round(w * 30 / 26);
  const gsz = Math.round(w * 0.52);

  const inner = routeNum
    ? `<span style="position:absolute;left:50%;top:41%;transform:translate(-50%,-50%);`
      + `color:#fff;font-weight:700;font-size:${hl ? '15px' : '13px'};font-family:system-ui,sans-serif">${routeNum}</span>`
    : `<span style="position:absolute;left:50%;top:41%;transform:translate(-50%,-50%);display:flex">`
      + `${shopIcon(shop, { size: gsz, stroke: '#fff', sw: 1.9 })}</span>`;

  const shadow = hl
    ? 'drop-shadow(0 4px 6px rgba(0,0,0,.4))'
    : 'drop-shadow(0 2px 3px rgba(0,0,0,.35))';

  const pin = `<svg width="${w}" height="${h}" viewBox="0 0 26 30" fill="none" style="display:block;filter:${shadow}">`
    + `<path d="M13 1.4C6.5 1.4 1.4 6.4 1.4 12.5c0 6.7 8.3 14.6 11 16.9.35.3.85.3 1.2 0 2.7-2.3 11-10.2 11-16.9C24.6 6.4 19.5 1.4 13 1.4Z" `
    + `fill="${bg}" stroke="#fff" stroke-width="${hl ? 2 : 1.7}"/></svg>`;

  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${w}px;height:${h}px;cursor:pointer;`
      + `transition:transform .18s">${pin}${inner}</div>`,
    iconSize:    [w, h],
    iconAnchor:  [w / 2, h],          // punt onderaan op de locatie
    popupAnchor: [0, -h + 3],
  });
}

/* ══ Popup HTML ══════════════════════════════════════════════════ */

function _popupHTML(shop) {
  const rating = shop.googleRating
    ? `<span class="popup-rating">⭐ ${shop.googleRating.toFixed(1)}</span>`
    : '';
  const tags = (shop.tags || [])
    .map(t => `<span class="popup-tag">${_e(t)}</span>`)
    .join('');
  const hours = shop.hours
    ? `<div class="popup-hours"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>${_e(shop.hours)}</div>`
    : '';

  return `
<div class="map-popup">
  <div class="popup-top">
    <span class="popup-emoji">${shopIcon(shop, { size: 22 })}</span>
    <div class="popup-info">
      <div class="popup-name">${_e(shop.name)}</div>
      <div class="popup-addr">${_e(shop.address)}</div>
    </div>
  </div>
  ${hours}
  <div class="popup-bottom">${tags}${rating}</div>
  ${_routeBtnHTML(shop)}
</div>`.trim();
}

/* Bouw de popup als DOM-element zodat de route-knop een betrouwbare,
   direct gekoppelde click-listener heeft (i.p.v. delegatie via popupopen).
   L.DomEvent.stop voorkomt dat de klik de popup laat sluiten of naar de kaart
   propageert. */
function _popupNode(shop) {
  const wrap = document.createElement('div');
  wrap.innerHTML = _popupHTML(shop);
  const el = wrap.firstElementChild;
  const btn = el.querySelector('.popup-route-btn');
  if (btn) {
    L.DomEvent.on(btn, 'click', ev => {
      L.DomEvent.stop(ev);
      toggleStop(shop.id, shop);   // shop meegeven → werkt ook zonder _allRef
      _syncPopupRouteBtn(btn);
    });
  }
  return el;
}

/* Knop om de winkel direct vanaf de kaart aan de route toe te voegen/halen. */
function _routeBtnHTML(shop) {
  const inR = isInRoute(shop.id);
  return `<button type="button" class="popup-route-btn${inR ? ' in-route' : ''}" `
    + `data-id="${shop.id}" aria-pressed="${inR}">`
    + `${inR ? '✓ In route' : '+ Voeg toe aan route'}</button>`;
}

/* Stel het uiterlijk van een route-knop in op de actuele route-status. */
function _syncPopupRouteBtn(btn) {
  const inR = isInRoute(+btn.dataset.id);
  btn.classList.toggle('in-route', inR);
  btn.setAttribute('aria-pressed', String(inR));
  btn.textContent = inR ? '✓ In route' : '+ Voeg toe aan route';
}

function _e(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
