/* ═══════════════════════════════════════════════════════════════
   boodschappenlijst.js
   Producten toevoegen → vind winkels → maak automatische route
   ═══════════════════════════════════════════════════════════════ */

import { toggleStop, clearRoute, isInRoute } from './route.js';

/* ── State ──────────────────────────────────────────────── */
let _list    = [];   // array van productstrings die de gebruiker heeft toegevoegd
let _allShops = [];

/* Veelgebruikte suggesties */
const SUGGESTIONS = [
  'kaas','eieren','melk','aardbeien','honing','groente','fruit',
  'vlees','worst','jam','appelen','brood','zuivel','biologisch',
  'pompoen','asperges','frambozen','tomaten','knoflook',
];

/* ══ Init ════════════════════════════════════════════════════ */

export function initBoodschappenlijst(shops) {
  _allShops = shops;
  _bind();
  _render();
}

/* ══ Controls ════════════════════════════════════════════════ */

function _bind() {
  const input  = document.getElementById('boodInput');
  const addBtn = document.getElementById('boodAddBtn');
  const clearBtn = document.getElementById('boodClearBtn');
  const routeBtn = document.getElementById('boodRouteBtn');

  addBtn?.addEventListener('click', () => _addFromInput());
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') _addFromInput(); });

  clearBtn?.addEventListener('click', () => { _list = []; _render(); });

  routeBtn?.addEventListener('click', () => {
    clearRoute();
    const shops = _getMatchedShops();
    // Voeg per product de dichtstbijzijnde winkel toe
    const added = new Set();
    for (const { shops: hits } of shops) {
      if (!hits.length) continue;
      for (const s of hits) {
        if (!added.has(s.id)) { toggleStop(s.id); added.add(s.id); break; }
      }
    }
    // Ga naar route-tab
    document.querySelector('[data-page="route"]')?.click();
    document.dispatchEvent(new CustomEvent('boerenroute:routechange'));
  });

  // Suggesties
  const suggEl = document.getElementById('boodSuggestions');
  if (suggEl) {
    suggEl.innerHTML = SUGGESTIONS
      .map(s => `<button class="bood-chip" data-product="${s}">${s}</button>`)
      .join('');
    suggEl.querySelectorAll('.bood-chip').forEach(btn => {
      btn.addEventListener('click', () => _addProduct(btn.dataset.product));
    });
  }
}

function _addFromInput() {
  const input = document.getElementById('boodInput');
  if (!input) return;
  const val = input.value.trim().toLowerCase();
  if (val) { _addProduct(val); input.value = ''; }
  input.focus();
}

function _addProduct(product) {
  if (!product || _list.includes(product)) return;
  _list.push(product);
  _render();
}

function _removeProduct(product) {
  _list = _list.filter(p => p !== product);
  _render();
}

/* ══ Matching ════════════════════════════════════════════════ */

function _getMatchedShops() {
  return _list.map(product => {
    const q = product.toLowerCase();
    const hits = _allShops.filter(s =>
      s.type !== 'onderweg' && (
        (s.products || []).some(p => p.toLowerCase().includes(q)) ||
        (s.tags    || []).some(t => t.toLowerCase().includes(q)) ||
        s.name.toLowerCase().includes(q)
      )
    );
    return { product, shops: hits };
  });
}

/* ══ Render ══════════════════════════════════════════════════ */

function _render() {
  const listEl   = document.getElementById('boodList');
  const emptyEl  = document.getElementById('boodEmpty');
  const resultEl = document.getElementById('boodResults');
  const routeBtn = document.getElementById('boodRouteBtn');
  const clearBtn = document.getElementById('boodClearBtn');
  if (!listEl) return;

  const hasItems = _list.length > 0;
  if (emptyEl) emptyEl.hidden = hasItems;
  if (clearBtn) clearBtn.hidden = !hasItems;

  // Geselecteerde producten
  listEl.innerHTML = _list.map(p => `
    <span class="bood-tag">
      ${_esc(p)}
      <button class="bood-remove" data-product="${_esc(p)}" aria-label="Verwijder ${_esc(p)}">&times;</button>
    </span>`).join('');

  listEl.querySelectorAll('.bood-remove').forEach(btn =>
    btn.addEventListener('click', () => _removeProduct(btn.dataset.product))
  );

  if (!hasItems) {
    if (resultEl) resultEl.innerHTML = '';
    if (routeBtn) routeBtn.hidden = true;
    return;
  }

  // Resultaten per product
  const matched = _getMatchedShops();
  const anyHits = matched.some(m => m.shops.length > 0);
  if (routeBtn) routeBtn.hidden = !anyHits;

  if (resultEl) {
    resultEl.innerHTML = matched.map(({ product, shops }) => `
      <div class="bood-result">
        <h3 class="bood-result-title">
          ${_esc(product)}
          <span class="bood-result-count">${shops.length} winkel${shops.length !== 1 ? 's' : ''}</span>
        </h3>
        ${shops.length === 0
          ? `<p class="bood-no-match">Geen winkels gevonden voor <em>${_esc(product)}</em>.</p>`
          : `<ul class="bood-shops">
              ${shops.slice(0, 5).map(s => `
                <li class="bood-shop-item">
                  <span class="bood-shop-emoji">${s.emoji}</span>
                  <div class="bood-shop-info">
                    <span class="bood-shop-name">${_esc(s.name)}</span>
                    <span class="bood-shop-addr">${_esc(s.address)}</span>
                  </div>
                  <button class="bood-add-route${isInRoute(s.id) ? ' in-route' : ''}"
                    data-id="${s.id}"
                    aria-label="${isInRoute(s.id) ? 'In route' : 'Voeg toe aan route'}">
                    ${isInRoute(s.id) ? '✓' : '+'}
                  </button>
                </li>`).join('')}
              ${shops.length > 5 ? `<li class="bood-more">+${shops.length-5} meer winkels — zoek op kaart</li>` : ''}
            </ul>`
        }
      </div>`).join('');

    // Route-knoppen per winkel
    resultEl.querySelectorAll('.bood-add-route').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleStop(+btn.dataset.id);
        const inR = isInRoute(+btn.dataset.id);
        btn.textContent = inR ? '✓' : '+';
        btn.classList.toggle('in-route', inR);
        document.dispatchEvent(new CustomEvent('boerenroute:routechange'));
      });
    });
  }
}

function _esc(s) {
  return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
