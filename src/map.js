/* ═══════════════════════════════════════════════════════════════
   map.js — Leaflet-kaart met gekleurde markers per type
   Leaflet geladen als global `L` via CDN in index.html
   ═══════════════════════════════════════════════════════════════ */

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

export function drawRoute(stops) {
  if (_routeLine) { _routeLine.remove(); _routeLine = null; }
  if (!stops.length || !_map) return;

  _routeLine = L.polyline(
    stops.map(s => [s.lat, s.lng]),
    { color: '#3B6D11', weight: 4, opacity: .85, lineJoin: 'round' }
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

function _icon(shop, hl, routeNum = null) {
  const bg   = routeNum ? COLOR.route : (COLOR[shop.type] || COLOR.route);
  const size = (hl || routeNum) ? 38 : 30;
  const label = routeNum ? `<span style="color:white;font-weight:700;font-size:${hl?'16px':'13px'};font-family:sans-serif">${routeNum}</span>` : shop.emoji;

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${bg};
      border-radius:50%;
      border:2.5px solid rgba(255,255,255,.9);
      box-shadow:${hl
        ? `0 0 0 3px ${bg}55,0 4px 16px rgba(0,0,0,.4)`
        : '0 2px 8px rgba(0,0,0,.28)'};
      display:flex;align-items:center;justify-content:center;
      font-size:${hl ? '18px' : '13px'};
      transform:${hl ? 'scale(1.18)' : 'scale(1)'};
      transition:transform .18s,box-shadow .18s;
      cursor:pointer;
    ">${label}</div>`,
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 8)],
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
    <span class="popup-emoji">${shop.emoji}</span>
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
