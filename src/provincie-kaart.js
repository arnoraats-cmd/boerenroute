/* Provincieverzamelaar — schematische kaart die bijhoudt welke provincies bezocht zijn */

import { getVisited } from './stamps.js';
import { provByCoords } from './province.js';

/* Schematisch grid (4×4): geografisch herkenbare plaatsing van 12 provincies.
   col=0 west, col=3 oost; row=0 noord, row=3 zuid. */
const GRID = [
  { id: 'Friesland',     abbr: 'FR', col: 1, row: 0 },
  { id: 'Groningen',     abbr: 'GR', col: 2, row: 0 },
  { id: 'Noord-Holland', abbr: 'NH', col: 0, row: 1 },
  { id: 'Flevoland',     abbr: 'FL', col: 1, row: 1 },
  { id: 'Drenthe',       abbr: 'DR', col: 2, row: 1 },
  { id: 'Overijssel',    abbr: 'OV', col: 3, row: 1 },
  { id: 'Zuid-Holland',  abbr: 'ZH', col: 0, row: 2 },
  { id: 'Utrecht',       abbr: 'UT', col: 1, row: 2 },
  { id: 'Gelderland',    abbr: 'GL', col: 2, row: 2, span: 2 },
  { id: 'Zeeland',       abbr: 'ZE', col: 0, row: 3 },
  { id: 'Noord-Brabant', abbr: 'NB', col: 1, row: 3, span: 2 },
  { id: 'Limburg',       abbr: 'LI', col: 3, row: 3 },
];

const C = 56, G = 4, P = 6;
const VW = P + 4 * (C + G) - G + P; // 248

const _x    = col  => P + col * (C + G);
const _y    = row  => P + row * (C + G);
const _w    = span => span * C + (span - 1) * G;

/* Telt stempels per provincie op basis van shop-coördinaten */
export function getVisitedProvinces(allShops) {
  const visited = getVisited();
  const counts  = {};
  for (const id of Object.keys(visited)) {
    const shop = allShops.find(s => String(s.id) === id);
    if (!shop) continue;
    const prov = provByCoords(shop.lat, shop.lng);
    if (prov) counts[prov] = (counts[prov] ?? 0) + 1;
  }
  return counts;
}

export function renderProvincieKaart(allShops) {
  const counts = getVisitedProvinces(allShops);
  const done   = Object.keys(counts).length;

  const cells = GRID.map(p => {
    const x  = _x(p.col), y = _y(p.row);
    const w  = _w(p.span ?? 1), h = C;
    const cx = x + w / 2, cy = y + h / 2;
    const n  = counts[p.id] ?? 0;
    const v  = n > 0;

    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"
        fill="${v ? 'var(--green-mid)' : '#E5E5E2'}"
        stroke="${v ? 'var(--green-dark)' : '#D0CFC8'}" stroke-width="1.5"/>
      <text x="${cx}" y="${cy + (v ? -7 : 0)}"
        text-anchor="middle" dominant-baseline="middle"
        font-family="DM Sans,sans-serif" font-size="13" font-weight="600"
        fill="${v ? '#FFF' : '#AAAA9F'}">${p.abbr}</text>
      ${v ? `<text x="${cx}" y="${cy + 10}"
        text-anchor="middle" dominant-baseline="middle"
        font-family="DM Sans,sans-serif" font-size="10.5"
        fill="rgba(255,255,255,.78)">${n}×</text>` : ''}`;
  }).join('\n');

  const footer = done === 0
    ? `<p class="prov-kaart-tip">Check in bij een boerderijwinkel om je eerste provincie te kleuren.</p>`
    : done === 12
      ? `<p class="prov-kaart-complete">🎉 Alle 12 provincies bezocht — jij bent een echte Boerenroute Ambassadeur!</p>`
      : '';

  return `<div class="prov-kaart">
  <div class="prov-kaart-hdr">
    <span class="prov-kaart-title">🗺️ Provincieverzamelaar</span>
    <span class="prov-kaart-score">${done}<span class="prov-kaart-total">/12</span></span>
  </div>
  <svg class="prov-kaart-svg" viewBox="0 0 ${VW} ${VW}"
    role="img" aria-label="Kaart van Nederland — ${done} van 12 provincies bezocht">
    ${cells}
  </svg>
  ${footer}
</div>`;
}
