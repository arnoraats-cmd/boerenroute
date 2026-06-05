/* Bottom sheet voor mobiel — 2 standen: half (standaard) en open */
export function initBottomSheet() {
  if (window.innerWidth > 900) return;

  const sheet   = document.querySelector('.list-section');
  const toolbar = document.querySelector('.toolbar');
  if (!sheet) return;

  /* ── Sleepgreep injecteren ───────────────────────────────────── */
  const handle = document.createElement('div');
  handle.className = 'sheet-handle';
  handle.setAttribute('aria-label', 'Sleep omhoog voor de volledige winkellijst');
  handle.innerHTML = `
    <div class="sheet-handle-bar"></div>
    <div class="sheet-handle-row">
      <span class="sheet-handle-label" id="sheetLabel">Winkels</span>
      <button class="sheet-map-btn" id="sheetMapBtn" aria-label="Terug naar kaart">← Kaart</button>
    </div>`;

  /* Bestaande inhoud in scrollbare wrapper */
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

  function applyMapTop() {
    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 106;
    const tbH     = toolbarH();
    const mapEl   = document.querySelector('.map-section');
    if (mapEl) mapEl.style.top = `${headerH + tbH}px`;
    if (toolbar) toolbar.style.top = `${headerH}px`;
  }

  function setState(s, animate = true) {
    state = s;
    if (!animate) sheet.classList.add('sheet-no-transition');
    sheet.classList.remove('sheet-half', 'sheet-open');
    sheet.classList.add('sheet-' + s);
    if (!animate) {
      sheet.getBoundingClientRect(); // force reflow
      sheet.classList.remove('sheet-no-transition');
    }
    // Toon/verberg "← Kaart" knop
    const mapBtn = document.getElementById('sheetMapBtn');
    if (mapBtn) mapBtn.style.display = s === 'open' ? 'inline-flex' : 'none';

    if (s === 'half') scroll.scrollTop = 0;
    // Leaflet hertekenen na animatie
    setTimeout(() => window.dispatchEvent(new CustomEvent('boerenroute:relayout')), 360);
  }

  setState('half', false);
  requestAnimationFrame(() => applyMapTop());

  /* ── Tik op greep ────────────────────────────────────────────── */
  handle.addEventListener('click', e => {
    if (e.target.id === 'sheetMapBtn') return; // knop heeft eigen handler
    setState(state === 'half' ? 'open' : 'half');
  });

  document.getElementById('sheetMapBtn')?.addEventListener('click', () => setState('half'));

  /* ── Sleep ───────────────────────────────────────────────────── */
  let startY = 0, startT = 0, dragging = false;

  function getTranslateY() {
    return new DOMMatrixReadOnly(getComputedStyle(sheet).transform).m42;
  }

  handle.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    startY = e.clientY;
    startT = getTranslateY();
    sheet.classList.add('sheet-no-transition');
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    const t  = Math.max(0, startT + dy);
    sheet.style.transform = `translateY(${t}px)`;
  });

  handle.addEventListener('pointerup', e => {
    if (!dragging) return;
    dragging = false;
    sheet.classList.remove('sheet-no-transition');
    sheet.style.transform = '';
    const dy = e.clientY - startY;
    // Swipe omlaag > 60px → half; omhoog > 60px → open; anders behoud staat
    if (dy > 60)       setState('half');
    else if (dy < -60) setState('open');
    else               setState(state);
  });

  /* ── Tik op kaart → terug naar half ─────────────────────────── */
  document.querySelector('.map-section')?.addEventListener('click', e => {
    if (e.target.closest('.leaflet-control, .br-popup, .leaflet-marker-icon')) return;
    if (state === 'open') setState('half');
  });

  /* ── Resize / rotate ─────────────────────────────────────────── */
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      sheet.style.transform = '';
      sheet.classList.remove('sheet-half', 'sheet-open', 'sheet-no-transition');
      return;
    }
    applyMapTop();
    setState(state, false);
  });
}
