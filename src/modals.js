/* ═══════════════════════════════════════════════════════════════
   modals.js — shop-detail, tip-formulier, winkel-aanmelden
   ═══════════════════════════════════════════════════════════════ */

import { toggleStop, isInRoute } from './route.js';

const FORMSPREE = 'https://formspree.io/f/xykvvprz';

let _overlay = null;

/* ══ Init ════════════════════════════════════════════════════════ */

export function initModals() {
  _overlay = document.getElementById('modalOverlay');

  _overlay?.addEventListener('click', e => {
    if (e.target === _overlay) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !_overlay?.hidden) closeModal();
  });

  document.getElementById('tipBtn')?.addEventListener('click', () => openTipModal());

  /* "Winkel aanmelden"-link in footer */
  document.getElementById('signupLink')?.addEventListener('click', e => {
    e.preventDefault();
    openSignupModal();
  });
}

/* ══ Generiek open/sluit ═════════════════════════════════════════ */

function _open(html) {
  if (!_overlay) return;
  _overlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  _overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  _overlay.querySelector('.modal-close')?.addEventListener('click', closeModal);
  requestAnimationFrame(() =>
    _overlay.querySelector('.modal-close, [autofocus], input, button')?.focus()
  );
}

export function closeModal() {
  if (!_overlay) return;
  _overlay.hidden = true;
  _overlay.innerHTML = '';
  document.body.style.overflow = '';
}

/* ══ Shop-detail modal ═══════════════════════════════════════════ */

export function openShopModal(shop) {
  _open(_shopHTML(shop));

  _overlay.querySelector('#modalRouteBtn')?.addEventListener('click', () => {
    toggleStop(shop.id);
    _refreshRouteBtn(shop.id);
    document.dispatchEvent(new CustomEvent('boerenroute:routechange'));
  });

  _overlay.querySelector('#modalTipBtn')?.addEventListener('click', () => {
    closeModal();
    openTipModal(shop.name);
  });
}

function _refreshRouteBtn(id) {
  const btn = _overlay?.querySelector('#modalRouteBtn');
  if (!btn) return;
  const inR = isInRoute(id);
  btn.textContent = inR ? '✓ In route' : '+ Route';
  btn.classList.toggle('btn-green', !inR);
  btn.classList.toggle('btn-ghost', inR);
}

function _shopHTML(shop) {
  const open   = _isOpenNow(shop.hours);
  const status = open === true
    ? '<span class="shop-badge badge-open">Nu open</span>'
    : open === false ? '<span class="shop-badge badge-closed">Gesloten</span>' : '';

  const mapsQ  = encodeURIComponent(`${shop.name}, ${shop.address}`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQ}`;
  const types   = { winkel:'Boerderijwinkel', automaat:'Versautomaat', zelfpluk:'Zelfpluk', markt:'Boerenmarkt', onderweg:'Uitje/onderweg' };
  const inR     = isInRoute(shop.id);

  const tags  = (shop.tags || []).map(t => `<span class="shop-tag">${_e(t)}</span>`).join('');
  const prods = (shop.products || []).join(' · ');

  const rating = shop.googleRating ? `
    <div class="modal-rating">
      <span>⭐ <strong>${shop.googleRating.toFixed(1)}</strong></span>
      ${shop.googleReviews ? `<span class="modal-reviews">${shop.googleReviews} beoordelingen</span>` : ''}
      ${shop.placeId ? `<a href="https://search.google.com/local/reviews?placeid=${shop.placeId}" target="_blank" rel="noopener" class="modal-link">Reviews lezen →</a>` : ''}
    </div>` : '';

  return `
    <button class="modal-close" aria-label="Sluit venster">&times;</button>
    <div class="modal-hero">
      <span class="modal-emoji" aria-hidden="true">${shop.emoji}</span>
      <div>
        <h2 class="modal-title" id="modalTitle">${_e(shop.name)}</h2>
        <div class="modal-meta">${types[shop.type] || shop.type} ${status}</div>
      </div>
    </div>

    <div class="modal-body">
      <div class="modal-row">
        <span class="modal-row-icon">📍</span>
        <div>${_e(shop.address)}
          <a href="${mapsUrl}" target="_blank" rel="noopener" class="modal-link">Routebeschrijving →</a>
        </div>
      </div>

      ${shop.hours ? `
      <div class="modal-row">
        <span class="modal-row-icon">🕐</span>
        <div>${_e(shop.hours)}</div>
      </div>` : ''}

      ${prods ? `<div class="modal-products">${_e(prods)}</div>` : ''}
      ${tags  ? `<div class="modal-tags">${tags}</div>` : ''}

      ${shop.dagVers ? `
      <div class="modal-dagvers">
        <span class="shop-badge badge-dagvers">🌿 Vandaag vers</span>
        ${_e(shop.dagVers)}
      </div>` : ''}

      ${rating}

      ${shop.desc ? `<p class="modal-desc">${_e(shop.desc)}</p>` : ''}
    </div>

    <div class="modal-footer">
      <button id="modalRouteBtn" class="btn ${inR ? 'btn-ghost' : 'btn-green'}" style="flex:1">
        ${inR ? '✓ In route' : '+ Route'}
      </button>
      <a href="${mapsUrl}" target="_blank" rel="noopener" class="btn btn-ghost">🗺️ Navigeren</a>
      <button id="modalTipBtn" class="btn btn-ghost">💡 Tip</button>
    </div>`;
}

/* ══ Tip-formulier ═══════════════════════════════════════════════ */

export function openTipModal(shopName = '') {
  _open(`
    <button class="modal-close" aria-label="Sluit">&times;</button>
    <div class="modal-hero">
      <span class="modal-emoji">💡</span>
      <div>
        <h2 class="modal-title">Tip sturen</h2>
        <p class="modal-meta">Ken je een winkel die er nog niet bij staat?</p>
      </div>
    </div>
    <form id="tipForm" class="modal-form">
      <input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">
      <label class="form-label">Over welke winkel?
        <input name="winkel" class="form-input" type="text"
          value="${_e(shopName)}" placeholder="Naam of adres van de winkel">
      </label>
      <label class="form-label">Jouw tip <span class="form-req">*</span>
        <textarea name="tip" class="form-textarea" rows="4" required
          placeholder="Openingstijden, producten, bijzonderheden…"></textarea>
      </label>
      <label class="form-label">E-mailadres <span class="form-opt">(optioneel)</span>
        <input name="email" class="form-input" type="email" placeholder="jouw@email.nl">
      </label>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary" id="tipSubmit">Verstuur tip</button>
      </div>
      <p class="form-status" id="tipStatus" hidden></p>
    </form>`);

  _bindForm('tipForm', 'tipSubmit', 'tipStatus', 'Verstuur tip', 'Bedankt voor je tip!', true);
}

/* ══ Winkel aanmelden ════════════════════════════════════════════ */

export function openSignupModal() {
  _open(`
    <button class="modal-close" aria-label="Sluit">&times;</button>
    <div class="modal-hero">
      <span class="modal-emoji">🌾</span>
      <div>
        <h2 class="modal-title">Winkel aanmelden</h2>
        <p class="modal-meta">Gratis vermeld worden op Boerenroute.nl</p>
      </div>
    </div>
    <form id="signupForm" class="modal-form">
      <input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">
      <input type="hidden" name="_subject" value="Winkelaanmelding Boerenroute.nl">
      <label class="form-label">Naam van de winkel <span class="form-req">*</span>
        <input name="naam" class="form-input" type="text" required placeholder="Bijv. Kaasboerderij De Zonnehoeve">
      </label>
      <label class="form-label">Adres <span class="form-req">*</span>
        <input name="adres" class="form-input" type="text" required placeholder="Straatnaam 1, Plaatsnaam">
      </label>
      <label class="form-label">Type
        <select name="type" class="form-input">
          <option>Boerderijwinkel</option>
          <option>Versautomaat / melktap</option>
          <option>Zelfpluk</option>
          <option>Boerenmarkt</option>
          <option>Uitje / onderweg</option>
        </select>
      </label>
      <label class="form-label">Openingstijden
        <input name="openingstijden" class="form-input" type="text"
          placeholder="Bijv. di–za 9–17u of dagelijks 8–21u">
      </label>
      <label class="form-label">Producten <span class="form-req">*</span>
        <input name="producten" class="form-input" type="text" required
          placeholder="Bijv. kaas, eieren, groente, jam…">
      </label>
      <label class="form-label">Jouw e-mailadres <span class="form-req">*</span>
        <input name="email" class="form-input" type="email" required placeholder="eigenaar@winkel.nl">
      </label>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary" id="signupSubmit">Aanmelden</button>
      </div>
      <p class="form-status" id="signupStatus" hidden></p>
    </form>`);

  _bindForm('signupForm', 'signupSubmit', 'signupStatus', 'Aanmelden', 'Aanmelding ontvangen! We nemen contact op.');
}

/* ══ Groente & fruit confetti ════════════════════════════════════ */

function _celebrate() {
  const EMOJIS = ['🥕','🍅','🥦','🌽','🍓','🍎','🍇','🥑','🍋','🥬','🫑','🥒','🍊','🫐','🍏','🥝','🍆','🧅','🥔','🌶️','🍑','🫒','🥜','🌿'];
  const wrap = document.createElement('div');
  wrap.className = 'emoji-burst';
  wrap.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < 48; i++) {
    const el = document.createElement('span');
    const drift = (Math.random() - 0.5) * 260;
    el.className   = 'emoji-flake';
    el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    el.style.left  = `${2 + Math.random() * 96}vw`;
    el.style.setProperty('--drift', `${drift}px`);
    el.style.animationDelay    = `${Math.random() * 1.4}s`;
    el.style.animationDuration = `${2.2 + Math.random() * 2.2}s`;
    el.style.fontSize = `${1.1 + Math.random() * 1.6}rem`;
    wrap.appendChild(el);
  }

  /* Dankjewel-banner */
  const banner = document.createElement('div');
  banner.className = 'bedankt-banner';
  banner.innerHTML = `
    <span class="bedankt-banner-icon">🌾</span>
    <div class="bedankt-banner-title">Bedankt!</div>
    <div class="bedankt-banner-sub">Jouw tip helpt andere fietsers verse producten te vinden.</div>`;

  document.body.appendChild(wrap);
  document.body.appendChild(banner);

  /* Opruimen na 4.5 seconden */
  setTimeout(() => { wrap.remove(); banner.remove(); }, 4500);
}

/* ══ Generieke formulier-handler ════════════════════════════════ */

function _bindForm(formId, btnId, statusId, btnLabel, successMsg, celebrate = false) {
  const form   = document.getElementById(formId);
  const btn    = document.getElementById(btnId);
  const status = document.getElementById(statusId);
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    btn.disabled    = true;
    btn.textContent = 'Versturen…';

    try {
      const res = await fetch(FORMSPREE, {
        method:  'POST',
        headers: { Accept: 'application/json' },
        body:    new FormData(form),
      });
      if (!res.ok) throw new Error();
      status.textContent = `✅ ${successMsg}`;
      status.className   = 'form-status form-ok';
      status.hidden      = false;
      form.reset();
      if (celebrate) _celebrate();
      setTimeout(closeModal, 3500);
    } catch {
      status.textContent = '❌ Verzenden mislukt — probeer het later opnieuw.';
      status.className   = 'form-status form-err';
      status.hidden      = false;
      btn.disabled       = false;
      btn.textContent    = btnLabel;
    }
  });
}

/* ══ Openingstijden-parser (zelfstandige kopie) ═════════════════ */

const _DAY = { ma:1, di:2, wo:3, do:4, vr:5, za:6, zo:0 };

function _isOpenNow(h) {
  if (!h) return null;
  if (/bel|mail|afspraak|\?/i.test(h)) return null;
  const now = new Date(), d = now.getDay(), m = now.getHours()*60+now.getMinutes();
  for (const seg of h.split(/[·•]/).map(s=>s.trim()).filter(Boolean)) {
    const tm = seg.match(/(\d+(?:[.,]\d+)?)\s*[–\-]\s*(\d+(?:[.,]\d+)?)u/);
    if (!tm) continue;
    const op = _pm(tm[1]), cl = _pm(tm[2]);
    const dp = seg.slice(0, seg.indexOf(tm[0])).trim().toLowerCase();
    if (!dp || /dagelijks|^ma[–\-]zo$/.test(dp)) { if(m>=op&&m<cl) return true; continue; }
    const rm = dp.match(/^([a-z]{2})\s*[–\-]\s*([a-z]{2})$/);
    if (rm) {
      const s=_DAY[rm[1]], e=_DAY[rm[2]];
      if (s==null||e==null) continue;
      const ir = s<=e ? d>=s&&d<=e : d>=s||d<=e;
      if (ir&&m>=op&&m<cl) return true; continue;
    }
    const dn=(dp.match(/[a-z]{2}/g)||[]).map(x=>_DAY[x]).filter(n=>n!=null);
    if (dn.includes(d)&&m>=op&&m<cl) return true;
  }
  return false;
}

function _pm(s) { const[h,m='0']=s.replace('u','').split(/[.,]/); return +h*60+ +m; }
function _e(s) {
  return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
