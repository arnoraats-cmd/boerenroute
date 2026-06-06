/* ═══════════════════════════════════════════════════════════════
   modals.js — shop-detail, tip-formulier, winkel-aanmelden
   ═══════════════════════════════════════════════════════════════ */

import { toggleStop, isInRoute } from './route.js';
import { checkIn, hasVisited } from './stamps.js';
import { shopIcon } from './icons.js';

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

  /* Check-in knop */
  const checkinBtn = _overlay.querySelector('#modalCheckinBtn');
  if (checkinBtn) {
    checkinBtn.addEventListener('click', () => _handleCheckin(shop, checkinBtn));
  }
}

/* Een stempel verdien je alleen ter plekke. Strikt op echte GPS-nabijheid. */
const CHECKIN_MAX_DISTANCE = 600;  // meter: hoe dichtbij je moet zijn
const CHECKIN_MAX_ACCURACY = 300;  // meter: grovere (laptop/IP) locatie weigeren

function _handleCheckin(shop, btn) {
  if (!navigator.geolocation) {
    _checkinBlock(btn, '📍 Dit toestel kan je locatie niet bepalen. Check-in lukt op je telefoon, bij de winkel.');
    return;
  }

  btn.textContent = '📍 Locatie controleren…';
  btn.disabled = true;
  btn.classList.remove('checkin-far');

  navigator.geolocation.getCurrentPosition(
    pos => {
      const d   = _haversineM(pos.coords.latitude, pos.coords.longitude, shop.lat, shop.lng);
      const acc = pos.coords.accuracy || 99999;

      if (acc > CHECKIN_MAX_ACCURACY) {
        _checkinBlock(btn, '📍 Je locatie is te onnauwkeurig om je bezoek te bevestigen. Dit lukt het best op je telefoon (met GPS aan), bij de winkel.');
      } else if (d <= CHECKIN_MAX_DISTANCE) {
        _doCheckin(shop, btn);
      } else {
        _checkinBlock(btn, `📍 Je bent nog ${_fmtAfstand(d)} van ${shop.name}. Je verdient je stempel ter plekke!`);
      }
    },
    err => {
      const msg = err.code === err.PERMISSION_DENIED
        ? '📍 Geef toegang tot je locatie om je bezoek te bevestigen.'
        : '📍 We konden je locatie niet bepalen. Probeer het opnieuw bij de winkel.';
      _checkinBlock(btn, msg);
    },
    { enableHighAccuracy: true, timeout: 9000, maximumAge: 8000 }
  );
}

/* Blokkeer: reset de knop zodat opnieuw proberen kan + toon reden */
function _checkinBlock(btn, msg) {
  btn.disabled = false;
  btn.classList.remove('checkin-far', 'checkin-done');
  btn.textContent = '📍 Check in — ik ben hier!';
  const hint = btn.parentElement?.querySelector('.modal-checkin-hint');
  if (hint) {
    hint.textContent = msg;
    hint.classList.add('checkin-hint-warn');
  }
}

function _doCheckin(shop, btn) {
  const isNew = checkIn(shop);
  if (isNew) {
    btn.textContent = '✅ Ingecheckt — stempel verdiend!';
    btn.disabled = true;
    btn.classList.remove('checkin-far');
    btn.classList.add('checkin-done');
    _stampBurst(btn, true);
    document.dispatchEvent(new CustomEvent('boerenroute:stampupdate'));
  } else {
    btn.textContent = '✅ Al bezocht';
    btn.disabled = true;
  }
}

function _fmtAfstand(m) {
  if (m < 1000) return `${Math.round(m / 50) * 50} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

function _stampBurst(anchorEl, verified) {
  const rect = anchorEl.getBoundingClientRect();
  const burst = document.createElement('div');
  burst.className = 'stamp-burst';
  burst.style.left = `${rect.left + rect.width / 2}px`;
  burst.style.top  = `${rect.top}px`;
  burst.innerHTML  = verified
    ? '<span class="stamp-burst-inner">📍<br><small>GPS ✓</small></span>'
    : '<span class="stamp-burst-inner">🗂️</span>';
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 1200);
}

function _haversineM(la1, lo1, la2, lo2) {
  const R = 6371000, dL = (la2-la1)*Math.PI/180, dG = (lo2-lo1)*Math.PI/180;
  const a = Math.sin(dL/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dG/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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
      <span class="modal-emoji" aria-hidden="true">${shopIcon(shop, { size: 34, sw: 1.6 })}</span>
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

      ${shop.phone ? `
      <div class="modal-row">
        <span class="modal-row-icon">📞</span>
        <div><a href="tel:${_e(shop.phone.replace(/\s/g, ''))}" class="modal-link">${_e(shop.phone)}</a></div>
      </div>` : ''}

      ${shop.website ? `
      <div class="modal-row">
        <span class="modal-row-icon">🌐</span>
        <div><a href="${_e(shop.website)}" target="_blank" rel="noopener nofollow" class="modal-link">Website bezoeken →</a></div>
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
    </div>
    <div class="modal-checkin-wrap">
      <button id="modalCheckinBtn"
        class="btn modal-checkin-btn ${hasVisited(shop.id) ? 'checkin-done' : ''}"
        ${hasVisited(shop.id) ? 'disabled' : ''}>
        ${hasVisited(shop.id) ? '✅ Al bezocht — stempel ontvangen!' : '📍 Check in — ik ben hier!'}
      </button>
      ${!hasVisited(shop.id) ? '<p class="modal-checkin-hint">Verdien een stempel op je digitale stempelkaart</p>' : ''}
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

/* ══ Reparatieschuur: probleem melden + snelle reparatie ════════ */

export function openWerkplaatsModal() {
  const page = document.querySelector('.nav-btn.active')?.textContent.trim() || 'Kaart';
  const sw = ('serviceWorker' in navigator);
  const diag = [
    `URL: ${location.href}`,
    `Pagina: ${page}`,
    `Scherm: ${window.innerWidth}x${window.innerHeight}`,
    `Online: ${navigator.onLine ? 'ja' : 'nee'}`,
    `Service worker: ${sw ? 'ja' : 'nee'}`,
    `Browser: ${navigator.userAgent}`,
  ].join('\n');

  _open(`
    <button class="modal-close" aria-label="Sluit">&times;</button>
    <div class="modal-hero">
      <span class="modal-emoji" aria-hidden="true">🛠️</span>
      <div>
        <h2 class="modal-title" id="modalTitle">De Reparatieschuur</h2>
        <div class="modal-meta">Hapert er iets? De boer helpt je op weg.</div>
      </div>
    </div>

    <div class="werkplaats">
      <div class="werkplaats-card werkplaats-fix">
        <h3 class="werkplaats-h">🔧 Snelle reparatie</h3>
        <p class="werkplaats-p">Werkt de site traag, oud of raar? Vaak helpt het om alles te verversen. <strong>Je opgeslagen stempels en favorieten blijven bewaard.</strong></p>
        <button class="btn btn-green" id="wpRepair">🚜 Repareer &amp; ververs</button>
        <p class="werkplaats-hint" id="wpHint" hidden></p>
      </div>

      <div class="werkplaats-card">
        <h3 class="werkplaats-h">📣 Melden bij de boer</h3>
        <p class="werkplaats-p">Klopt er iets niet, of blijft het haperen? Laat het weten — dan gaan we ermee aan de slag.</p>
        <form id="bugForm" class="modal-form">
          <input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">
          <input type="hidden" name="_subject" value="🛠️ Probleemmelding Boerenroute.nl">
          <input type="hidden" name="technische_info" value="${_e(diag)}">
          <label class="form-label">Wat is er aan de hand? <span class="form-req">*</span>
            <select name="soort" class="form-input">
              <option>Verkeerde winkelinfo (adres/producten)</option>
              <option>Openingstijden kloppen niet</option>
              <option>Kapotte link of knop</option>
              <option>Kaart of route werkt niet</option>
              <option>Winkel bestaat niet meer</option>
              <option>Iets anders</option>
            </select>
          </label>
          <label class="form-label">Welke winkel of waar? <span class="form-opt">(optioneel)</span>
            <input name="waar" class="form-input" type="text" placeholder="Naam van de winkel of plek op de site">
          </label>
          <label class="form-label">Omschrijving <span class="form-req">*</span>
            <textarea name="omschrijving" class="form-textarea" rows="3" required placeholder="Beschrijf kort wat er misgaat…"></textarea>
          </label>
          <label class="form-label">Jouw e-mail <span class="form-opt">(optioneel, voor terugkoppeling)</span>
            <input name="email" class="form-input" type="email" placeholder="jij@email.nl">
          </label>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="bugSubmit">📨 Versturen naar de boer</button>
          </div>
          <p class="form-status" id="bugStatus" hidden></p>
        </form>
      </div>
    </div>`);

  document.getElementById('wpRepair')?.addEventListener('click', _repair);
  _bindForm('bugForm', 'bugSubmit', 'bugStatus', '📨 Versturen naar de boer', 'Bedankt! De boer gaat ermee aan de slag. 🚜', 'fix');
}

async function _repair() {
  const btn  = document.getElementById('wpRepair');
  const hint = document.getElementById('wpHint');
  if (btn) { btn.disabled = true; btn.textContent = '🔧 Bezig met repareren…'; }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch { /* niets — we herladen sowieso */ }
  if (hint) { hint.textContent = '✅ Opgeschoond! De pagina wordt opnieuw geladen…'; hint.hidden = false; }
  setTimeout(() => location.reload(), 900);
}

/* ══ Groente & fruit confetti ════════════════════════════════════ */

/* Regiospecifieke bedankteksten */
const _REGIO = {
  friesland:       { title: 'Tankewol!',            sub: 'Dyn tip helpt oare fytsers farske produkten fine.',              icon: '🐄' },
  groningen:       { title: 'Haile dank!',           sub: 'Mooi dat je dit doorgeeft aan andere fietsers in Groningen.',   icon: '🌻' },
  drenthe:         { title: 'Dankewel!',             sub: 'Nös, goed bezig! Jouw tip helpt andere fietsers.',             icon: '🌿' },
  overijssel:      { title: "Da's top, maat!",       sub: 'Bedankt voor je tip uit Overijssel!',                          icon: '🌾' },
  flevoland:       { title: 'Goed gedaan!',          sub: 'Jouw tip helpt andere fietsers verse producten te vinden.',    icon: '🥕' },
  gelderland:      { title: 'Dank je wel!',          sub: 'Jouw tip helpt andere fietsers in de Gelderse natuur.',        icon: '🍎' },
  utrecht:         { title: 'Echt top!',             sub: 'Gaaf dat je dit doorgeeft aan andere fietsers!',               icon: '🌱' },
  'noord-holland': { title: 'Tof zeg, bedankt!',     sub: 'Gaaf dat je dit doorgeeft! Anderen fietsen er blij mee.',     icon: '🧀' },
  'zuid-holland':  { title: 'Hartstikke bedankt!',   sub: 'Jouw tip helpt andere fietsers verse producten te vinden.',   icon: '🌷' },
  zeeland:         { title: 'Dank joe woel!',         sub: 'Jouw tip helpt andere fietsers in het mooie Zeeland.',       icon: '🦞' },
  'noord-brabant': { title: 'Ge zijt een schat!',    sub: 'Dikke merci! Jouw tip helpt andere fietsers in Brabant.',     icon: '🌾' },
  limburg:         { title: 'Proficiat, daanke!',    sub: 'Jouw tip helpt andere fietsers in het heuvelland.',           icon: '🍇' },
  default:         { title: 'Bedankt!',              sub: 'Jouw tip helpt andere fietsers verse producten te vinden.',   icon: '🌾' },
};

function _detectRegio(lat, lng) {
  if (!lat || !lng) return 'default';
  /* Volgorde van specifiek naar algemeen */
  if (lat > 52.95 && lng > 6.4)                          return 'groningen';
  if (lat > 52.7  && lng < 6.4)                          return 'friesland';
  if (lat > 52.45 && lat < 53.0  && lng > 6.3)           return 'drenthe';
  if (lat > 52.2  && lat < 52.8  && lng > 5.2 && lng < 6.05) return 'flevoland';
  if (lat > 52.1  && lat < 52.85 && lng > 6.05)          return 'overijssel';
  if (lat > 51.7  && lat < 52.5  && lng > 5.5)           return 'gelderland';
  if (lat > 51.9  && lat < 52.35 && lng > 4.8 && lng < 5.55) return 'utrecht';
  if (lat > 52.2  && lng > 4.45  && lng < 5.4)           return 'noord-holland';
  if (lat > 51.7  && lat < 52.25 && lng > 3.85 && lng < 5.1) return 'zuid-holland';
  if (lat < 51.75 && lng < 4.35)                         return 'zeeland';
  if (lat < 51.8  && lng > 5.5)                          return 'limburg';
  if (lat < 51.8)                                         return 'noord-brabant';
  return 'default';
}

function _celebrate(mode = 'tip') {
  const isFix = mode === 'fix';
  const EMOJIS = isFix
    ? ['🔧','🔨','🪛','🛠️','⚙️','🧰','📏','🪚','🔩','🧲','🪜']
    : ['🥕','🍅','🥦','🌽','🍓','🍎','🍇','🥑','🍋','🥬','🫑','🥒','🍊','🫐','🍏','🥝','🍆','🧅','🥔','🌶️','🍑','🫒','🥜','🌿'];
  const DURATION = 7500; // ms — langer hangen

  /* Regioboodschap */
  const regio = _detectRegio(window._brLat, window._brLng);
  const msg   = _REGIO[regio] || _REGIO.default;

  /* Confetti-wrapper */
  const wrap = document.createElement('div');
  wrap.className = 'emoji-burst';
  wrap.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < 55; i++) {
    const el = document.createElement('span');
    const drift = (Math.random() - 0.5) * 300;
    el.className   = 'emoji-flake';
    el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    el.style.left  = `${1 + Math.random() * 98}vw`;
    el.style.setProperty('--drift', `${drift}px`);
    el.style.animationDelay    = `${Math.random() * 2}s`;
    el.style.animationDuration = `${3 + Math.random() * 2.5}s`;
    el.style.fontSize = `${1.1 + Math.random() * 1.8}rem`;
    wrap.appendChild(el);
  }

  /* Dankjewel-banner met regiotekst */
  const banner = document.createElement('div');
  banner.className = 'bedankt-banner' + (isFix ? ' fix-banner' : '');
  banner.innerHTML = isFix
    ? `<div class="fix-anim" aria-hidden="true">
         <span class="fix-bug">🪲</span>
         <span class="fix-splat">💥</span>
         <span class="fix-done">✅</span>
       </div>
       <div class="bedankt-banner-title">${msg.title}</div>
       <div class="bedankt-banner-sub">Bedankt voor je melding — de boer pakt de gereedschapskist erbij. 🛠️</div>`
    : `<span class="bedankt-banner-icon">${msg.icon}</span>
       <div class="bedankt-banner-title">${msg.title}</div>
       <div class="bedankt-banner-sub">${msg.sub}</div>`;

  document.body.appendChild(wrap);
  document.body.appendChild(banner);

  /* Fade-out en opruimen */
  setTimeout(() => {
    wrap.style.transition   = 'opacity .8s';
    banner.style.transition = 'opacity .8s, transform .8s';
    wrap.style.opacity   = '0';
    banner.style.opacity = '0';
    banner.style.transform = 'translate(-50%,-50%) scale(.9)';
  }, DURATION - 900);

  setTimeout(() => { wrap.remove(); banner.remove(); }, DURATION);
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
      if (celebrate) _celebrate(celebrate === true ? 'tip' : celebrate);
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
