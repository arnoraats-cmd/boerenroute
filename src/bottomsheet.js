/* Bottom sheet voor mobiel — layout volledig via JS, geen CSS-cascade problemen */

const MOBILE_W = 900;

function isMobile() { return window.innerWidth <= MOBILE_W; }

/* Pas de kaart-layout direct toe via inline styles (hoogste prioriteit) */
function applyLayout(headerH, toolbarH) {
  const map     = document.querySelector('.map-section');
  const list    = document.querySelector('.list-section');
  const wrap    = document.querySelector('.content-wrap');
  const toolbar = document.querySelector('.toolbar');

  if (!map || !list) return;

  if (isMobile() && document.body.classList.contains('map-active')) {
    const top = headerH + toolbarH;
    // Content-wrap: geen grid meer
    if (wrap) { wrap.style.display = 'block'; wrap.style.position = 'relative'; }
    // Kaart: fullscreen
    map.style.cssText = `
      position: fixed !important;
      top: ${top}px !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100% !important;
      height: auto !important;
      max-height: none !important;
      z-index: 10;
    `;
    // Toolbar: vast bovenaan
    if (toolbar) {
      toolbar.style.position = 'fixed';
      toolbar.style.top = `${headerH}px`;
      toolbar.style.left = '0';
      toolbar.style.right = '0';
      toolbar.style.zIndex = '20';
    }
  } else {
    // Herstel desktop layout
    if (wrap)    { wrap.style.display = ''; wrap.style.position = ''; }
    if (map)     map.style.cssText = '';
    if (toolbar) toolbar.style.cssText = '';
    if (list)    list.style.transform = '';
  }
}

/* Lees header-hoogte uit CSS-variabele */
function getHeaderH() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim();
  return parseInt(v) || 106;
}

export function initBottomSheet() {
  if (!isMobile()) return;

  const sheet   = document.querySelector('.list-section');
  const toolbar = document.querySelector('.toolbar');
  if (!sheet) return;

  /* ── Sleepgreep injecteren ───────────────────────────────────── */
  const handle = document.createElement('div');
  handle.className = 'sheet-handle';
  handle.innerHTML = `
    <div class="sheet-handle-bar"></div>
    <div class="sheet-handle-row">
      <span class="sheet-handle-label">Winkels</span>
      <button class="sheet-map-btn" id="sheetMapBtn">← Kaart</button>
    </div>`;

  const scroll = document.createElement('div');
  scroll.className = 'sheet-scroll';
  while (sheet.firstChild) scroll.appendChild(sheet.firstChild);
  sheet.appendChild(handle);
  sheet.appendChild(scroll);

  /* ── State ───────────────────────────────────────────────────── */
  let state = 'half';

  function toolbarH() {
    return toolbar ? toolbar.getBoundingClientRect().height : 0;
  }

  function refreshLayout() {
    applyLayout(getHeaderH(), toolbarH());
  }

  /* Exporteer refreshLayout zodat shops.js het kan aanroepen */
  window.__refreshMobileLayout = refreshLayout;

  function setState(s, animate = true) {
    state = s;
    if (!animate) sheet.classList.add('sheet-no-transition');
    sheet.classList.remove('sheet-half', 'sheet-open');
    sheet.classList.add('sheet-' + s);
    if (!animate) {
      sheet.getBoundingClientRect();
      sheet.classList.remove('sheet-no-transition');
    }
    const mapBtn = document.getElementById('sheetMapBtn');
    if (mapBtn) mapBtn.style.display = s === 'open' ? 'inline-flex' : 'none';
    if (s === 'half') scroll.scrollTop = 0;
    setTimeout(() => window.dispatchEvent(new CustomEvent('boerenroute:relayout')), 360);
  }

  /* Stel list-section positie in via inline style — alleen als map actief is */
  function positionSheet() {
    if (!document.body.classList.contains('map-active')) return;
    document.body.classList.toggle('sheet-is-open', state === 'open');
    const h = window.innerHeight;
    if (state === 'half') {
      sheet.style.cssText = `
        position: fixed !important;
        left: 0; right: 0; bottom: 0;
        z-index: 30;
        height: ${Math.round(h * 0.52)}px;
        border-radius: 20px 20px 0 0;
        background: white;
        box-shadow: 0 -4px 24px rgba(0,0,0,.15);
        overflow: hidden;
        transition: height .36s cubic-bezier(.32,.72,0,1);
      `;
    } else {
      sheet.style.cssText = `
        position: fixed !important;
        left: 0; right: 0; bottom: 0;
        z-index: 30;
        height: calc(100dvh - ${getHeaderH()}px);
        border-radius: 20px 20px 0 0;
        background: white;
        box-shadow: 0 -4px 24px rgba(0,0,0,.15);
        overflow: hidden;
        transition: height .36s cubic-bezier(.32,.72,0,1);
      `;
    }
  }

  /* ── Initialiseer ────────────────────────────────────────────── */
  /* Géén positionSheet() bij laden: de lijst blijft in normale flow tot
     er een locatie gekozen is (map-active). Voorkomt layout shift (CLS). */
  if (document.body.classList.contains('map-active')) {
    refreshLayout();
    positionSheet();
  }

  /* ── Tik op greep ────────────────────────────────────────────── */
  handle.addEventListener('click', e => {
    if (e.target.id === 'sheetMapBtn') return;
    state = state === 'half' ? 'open' : 'half';
    positionSheet();
    const mapBtn = document.getElementById('sheetMapBtn');
    if (mapBtn) mapBtn.style.display = state === 'open' ? 'inline-flex' : 'none';
    if (state === 'half') scroll.scrollTop = 0;
    setTimeout(() => window.dispatchEvent(new CustomEvent('boerenroute:relayout')), 380);
  });

  document.getElementById('sheetMapBtn')?.addEventListener('click', () => {
    state = 'half';
    positionSheet();
    document.getElementById('sheetMapBtn').style.display = 'none';
    scroll.scrollTop = 0;
  });

  /* ── Sleep ───────────────────────────────────────────────────── */
  let startY = 0, startH = 0, dragging = false;

  handle.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    startY = e.clientY;
    startH = sheet.getBoundingClientRect().height;
    sheet.style.transition = 'none';
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dy = startY - e.clientY; // omhoog = positief
    const newH = Math.max(80, Math.min(window.innerHeight - getHeaderH(), startH + dy));
    sheet.style.height = `${newH}px`;
  });

  handle.addEventListener('pointerup', e => {
    if (!dragging) return;
    dragging = false;
    const dy = startY - e.clientY;
    if (dy > 60)       state = 'open';
    else if (dy < -60) state = 'half';
    positionSheet();
    const mapBtn = document.getElementById('sheetMapBtn');
    if (mapBtn) mapBtn.style.display = state === 'open' ? 'inline-flex' : 'none';
    if (state === 'half') scroll.scrollTop = 0;
    setTimeout(() => window.dispatchEvent(new CustomEvent('boerenroute:relayout')), 380);
  });

  /* ── Tik op kaart → terug naar half ─────────────────────────── */
  document.querySelector('.map-section')?.addEventListener('click', e => {
    if (e.target.closest('.leaflet-control, .br-popup, .leaflet-marker-icon')) return;
    if (state === 'open') {
      state = 'half';
      positionSheet();
      document.getElementById('sheetMapBtn')?.style.setProperty('display','none');
      scroll.scrollTop = 0;
    }
  });

  /* ── Resize ──────────────────────────────────────────────────── */
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      const map  = document.querySelector('.map-section');
      const wrap = document.querySelector('.content-wrap');
      if (map)  map.style.cssText  = '';
      if (wrap) wrap.style.cssText = '';
      sheet.style.cssText = '';
      if (toolbar) toolbar.style.cssText = '';
      return;
    }
    if (!document.body.classList.contains('map-active')) return;
    refreshLayout();
    positionSheet();
  });

  /* Activeer de sheet-layout zodra map-active gezet wordt (na locatiekeuze) */
  window.__activateSheet = () => {
    refreshLayout();
    positionSheet();
  };
}

/* Aanroepbaar vanuit shops.js nadat map-active gezet is */
export function activateMobileLayout() {
  if (!isMobile()) return;
  const headerH = getHeaderH();
  const toolbar = document.querySelector('.toolbar');
  const tbH     = toolbar ? toolbar.getBoundingClientRect().height : 56;
  applyLayout(headerH, tbH);
  // Positioneer de sheet nu pas (map-active staat aan) — geen CLS bij laden
  if (window.__activateSheet) window.__activateSheet();
}
