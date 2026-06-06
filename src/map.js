/* ═══════════════════════════════════════════════════════════════
   map.js — Leaflet-kaart met gekleurde markers per type
   Leaflet geladen als global `L` via CDN in index.html
   ═══════════════════════════════════════════════════════════════ */

import { shopIcon } from './icons.js';

/* Kleuren per type (zie CLAUDE.md) */
const COLOR = {
  winkel:   '#64748B', // grijs
  automaat: '#2563EB', // blauw
  markt:    '#92400E', // bruin
  onderweg: '#7C3AED', // paars
  route:    '#3B6D11', // groen (in route)
};

let _map        = null;
let _group      = null;
let _routeLine  = null;
let _routeNums  = new Map(); // id → routenummer (1-based)
const _data     = new Map(); // id → { marker, shop }
let _hl         = null;      // id van huidig uitgelicht marker
let _drawVer    = 0;         // versieteller om stale OSRM-responses te negeren

/* ══ Init ════════════════════════════════════════════════════════ */

export function initMap({ lat = 51.6606, lng = 5.6188 } = {}) {
  document.querySelector('#map .map-placeholder')?.remove();

  _map = L.map('map', {
    center: [lat, lng],
    zoom: 11,
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

  _group = L.layerGroup().addTo(_map);
}

/* ══ Markers ════════════════════════════════════════════════════ */

export function renderMarkers(shops) {
  if (!_map || !_group) return;

  _group.clearLayers();
  _data.clear();
  _hl = null;

  shops.forEach(shop => {
    const marker = L.marker([shop.lat, shop.lng], {
      icon: _icon(shop, false),
      title: shop.name,
      riseOnHover: true,
    });

    marker.bindPopup(_popupHTML(shop), {
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

    _group.addLayer(marker);
    _data.set(shop.id, { marker, shop });
  });
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
    marker.openPopup();
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

  try {
    const coords  = stops.map(s => `${s.lng},${s.lat}`).join(';');
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('timeout')), 8000)
    );
    const data = await Promise.race([
      fetch(
        `https://router.project-osrm.org/route/v1/cycling/${coords}` +
        `?geometries=geojson&overview=full&steps=false`
      ).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      timeout,
    ]);

    if (ver !== _drawVer) return; // nieuwere aanvraag onderweg, negeer

    if (data.code === 'Ok' && data.routes?.[0]) {
      _routeLine = L.geoJSON(data.routes[0].geometry, {
        style: { color: '#3B6D11', weight: 5, opacity: .9, lineJoin: 'round', lineCap: 'round' },
      }).addTo(_map);
      _map.fitBounds(_routeLine.getBounds(), { padding: [48, 48], maxZoom: 14 });

      /* Stuur werkelijke wegafstand terug voor het routepaneel */
      const km = data.routes[0].distance / 1000;
      document.dispatchEvent(new CustomEvent('boerenroute:routedistance', { detail: { km } }));
    } else {
      _drawFallback(stops);
    }
  } catch {
    if (ver !== _drawVer) return;
    _drawFallback(stops);
  }
}

function _drawFallback(stops) {
  _routeLine = L.polyline(
    stops.map(s => [s.lat, s.lng]),
    { color: '#3B6D11', weight: 4, opacity: .6, dashArray: '10 8', lineJoin: 'round' }
  ).addTo(_map);
}

/* Zet markers voor route-stops op genummerde iconen */
export function setRouteMarkers(stops) {
  if (!_map) return;
  _routeNums.clear();
  stops.forEach((s, i) => _routeNums.set(s.id, i + 1));

  // Herrender alle zichtbare markers
  _data.forEach(({ marker, shop }) => {
    const num = _routeNums.get(shop.id) ?? null;
    const hl  = _hl === shop.id;
    marker.setIcon(_icon(shop, hl, num));
  });
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
</div>`.trim();
}

function _e(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
