/* Bottom sheet voor mobiel — sleepbaar paneel over de kaart */
export function initBottomSheet() {
  if (window.innerWidth > 720) return; // alleen op mobiel

  const sheet    = document.querySelector('.list-section');
  const toolbar  = document.querySelector('.toolbar');
  if (!sheet) return;

  /* ── Injecteer sleepgreep bovenaan het sheet ─────────────────── */
  const handle = document.createElement('div');
  handle.className = 'sheet-handle';
  handle.setAttribute('aria-label', 'Sleep omhoog voor de winkellijst');
  handle.innerHTML = `
    <div class="sheet-handle-bar"></div>
    <span class="sheet-handle-label" id="sheetLabel">Sleep omhoog voor winkels</span>`;

  /* Wrap de bestaande inhoud in een scrollbaar div */
  const scroll = document.createElement('div');
  scroll.className = 'sheet-scroll';
  while (sheet.firstChild) scroll.appendChild(sheet.firstChild);
  sheet.appendChild(handle);
  sheet.appendChild(scroll);

  /* ── Dynamische toolbar-hoogte ───────────────────────────────── */
  function toolbarH() {
    return toolbar ? toolbar.getBoundingClientRect().height : 0;
  }

  /* ── Driestandenmachine ──────────────────────────────────────── */
  // peek = onderkant zichtbaar (standaard)
  // half = halverwege
  // open = volledig open
  let state = 'peek';

  const PEEK_VISIBLE = 72; // hoogte van de greep in peek-stand

  function setToolbarOffset() {
    const h = toolbarH();
    sheet.style.setProperty('--tb-h', h + 'px');
    // Pas ook de kaart aan zodat die onder de toolbar begint
    const map = document.querySelector('.map-section');
    if (map) map.style.top = `calc(var(--header-h) + ${h}px)`;
    if (toolbar) toolbar.style.top = 'var(--header-h)';
  }

  function setState(s, animate = true) {
    state = s;
    sheet.classList.toggle('sheet-dragging', false);
    sheet.classList.remove('sheet-peek', 'sheet-half', 'sheet-open');

    if (!animate) sheet.classList.add('sheet-dragging'); // skip transition
    sheet.classList.add('sheet-' + s);

    const label = document.getElementById('sheetLabel');
    if (label) {
      if (s === 'peek') label.textContent = 'Sleep omhoog voor winkels';
      if (s === 'half') label.textContent = 'Winkels';
      if (s === 'open') label.textContent = 'Winkels';
    }
    // scroll bij open terug naar top
    if (s === 'peek') scroll.scrollTop = 0;
  }

  /* Start in half-stand zodat gebruiker meteen winkels ziet */
  setState('half', false);
  setToolbarOffset();
  updateFab();

  /* ── Touch / Pointer drag ────────────────────────────────────── */
  let startY = 0, startTranslate = 0, currentTranslate = 0, dragging = false;

  function getTranslate() {
    const m = new DOMMatrixReadOnly(getComputedStyle(sheet).transform);
    return m.m42; // translateY
  }

  function sheetH() { return sheet.getBoundingClientRect().height; }

  handle.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    startY = e.clientY;
    startTranslate = getTranslate();
    sheet.classList.add('sheet-dragging');
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    currentTranslate = Math.max(0, startTranslate + dy);
    sheet.style.transform = `translateY(${currentTranslate}px)`;
  });

  handle.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    sheet.style.transform = '';
    sheet.classList.remove('sheet-dragging');

    const h = sheetH();
    const peekY  = h - PEEK_VISIBLE;
    const halfY  = h * 0.40;
    const openY  = 0;

    const distPeek = Math.abs(currentTranslate - peekY);
    const distHalf = Math.abs(currentTranslate - halfY);
    const distOpen = Math.abs(currentTranslate - openY);

    if (distOpen <= distHalf && distOpen <= distPeek) setState('open');
    else if (distHalf <= distPeek)                    setState('half');
    else                                               setState('peek');
    updateFab();
  });

  /* Tik op greep → cyclus door standen */
  handle.addEventListener('click', () => {
    if (state === 'peek') setState('half');
    else if (state === 'half') setState('open');
    else setState('peek');
  });

  /* ── FAB: zwevende knop op de kaart ─────────────────────────── */
  const fab = document.getElementById('sheetFab');
  const fabCount = document.getElementById('sheetFabCount');

  function updateFab() {
    if (!fab) return;
    // Toon FAB alleen in peek-stand
    if (state === 'peek') fab.removeAttribute('hidden');
    else fab.setAttribute('hidden', '');
  }

  fab?.addEventListener('click', () => setState('half'));

  // Houd shopcount bij via de bestaande teller in de DOM
  const observer = new MutationObserver(() => {
    const countEl = document.getElementById('shopCount') || document.querySelector('.shop-count');
    if (countEl && fabCount) fabCount.textContent = countEl.textContent.trim().replace(/\D+.*/, '') || '…';
  });
  const shopList = document.querySelector('.shop-list') || document.getElementById('shopList');
  if (shopList) observer.observe(shopList, { childList: true, subtree: false });

  const origSetState = setState;
  // Overschrijf setState om FAB bij te werken
  // (kan niet herschrijven, gebruik wrapper)
  window.__updateSheetFab = updateFab;

  /* ── Sluit sheet als gebruiker op de kaart tikt ─────────────── */
  document.querySelector('.map-section')?.addEventListener('click', e => {
    if (e.target.closest('.leaflet-control, .br-popup')) return;
    if (state !== 'peek') { setState('peek'); updateFab(); }
  });

  /* ── Herbereken bij rotate / resize ─────────────────────────── */
  window.addEventListener('resize', () => {
    if (window.innerWidth > 720) {
      // Herstel desktop layout
      sheet.style.transform = '';
      sheet.classList.remove('sheet-peek','sheet-half','sheet-open');
      return;
    }
    setToolbarOffset();
    setState(state, false);
  });

  /* Wacht op toolbar render */
  requestAnimationFrame(() => setToolbarOffset());
}
