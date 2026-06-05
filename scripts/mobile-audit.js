/**
 * Boerenroute Mobile Audit
 * Gebruik: kopieer alles hieronder en plak het in de browser-console (F12 → Console)
 * terwijl je de site in mobiele modus bekijkt (Chrome DevTools → telefoon-icoontje).
 *
 * Het script rapporteert:
 *  1. Elementen die buiten het scherm uitsteken (oorzaak horizontaal scrollen)
 *  2. Klikbare elementen die te klein zijn voor vingers (< 44px)
 *  3. Invoervelden met font-size < 16px (iOS zoomt dan automatisch in)
 *  4. Tekst die te klein is om te lezen (< 12px)
 */
(function mobileAudit() {
  const W = document.documentElement.clientWidth;
  const issues = [];

  // ── 1. Elementen breder dan het scherm (horizontale overflow) ──────
  const all = document.querySelectorAll('*');
  const wide = [];
  all.forEach(el => {
    // Leaflet en scrollbare containers: onderdelen mogen buiten de clip-grens vallen
    if (el.closest('.leaflet-container, .leaflet-pane, .leaflet-map-pane')) return;
    if (el.closest('[style*="overflow-x: auto"], [style*="overflow-x:auto"]')) return;
    const parent = el.parentElement;
    if (parent && getComputedStyle(parent).overflowX === 'auto') return;
    const r = el.getBoundingClientRect();
    if (r.right > W + 2) { // +2px tolerantie voor afrondingsfouten
      wide.push({ el, overshoot: Math.round(r.right - W), tag: el.tagName, cls: el.className?.toString().slice(0,60) });
    }
  });
  if (wide.length) {
    issues.push(`\n🔴 HORIZONTALE OVERFLOW (${wide.length} elementen):`);
    wide.slice(0, 10).forEach(({ tag, cls, overshoot }) =>
      issues.push(`   ${tag}${cls ? ' .' + cls.split(' ')[0] : ''} → ${overshoot}px buiten scherm`)
    );
    if (wide.length > 10) issues.push(`   … en nog ${wide.length - 10} meer`);
  } else {
    issues.push('\n✅ Geen horizontale overflow gevonden');
  }

  // ── 2. Klikbare elementen te klein voor vingers (< 44×44px) ────────
  const clickable = document.querySelectorAll('a, button, input[type=checkbox], input[type=radio], select, [role=button]');
  const smallTap = [];
  clickable.forEach(el => {
    if (el.closest('.leaflet-control-attribution')) return; // attributielinks zijn bewust klein
    const r = el.getBoundingClientRect();
    if ((r.width < 44 || r.height < 44) && r.width > 0) {
      smallTap.push({ tag: el.tagName, w: Math.round(r.width), h: Math.round(r.height), text: (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().slice(0,30) });
    }
  });
  if (smallTap.length) {
    issues.push(`\n🟡 TE KLEINE TAPGEBIEDEN (${smallTap.length} elementen, min. 44×44px):`);
    smallTap.slice(0, 8).forEach(({ tag, w, h, text }) =>
      issues.push(`   ${tag} ${w}×${h}px — "${text}"`)
    );
    if (smallTap.length > 8) issues.push(`   … en nog ${smallTap.length - 8} meer`);
  } else {
    issues.push('\n✅ Alle tapgebieden zijn groot genoeg');
  }

  // ── 3. Invoervelden met font-size < 16px (iOS zoom-trigger) ────────
  const inputs = document.querySelectorAll('input, textarea, select');
  const smallFont = [];
  inputs.forEach(el => {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 16) smallFont.push({ tag: el.tagName, fs: fs.toFixed(1), id: el.id || el.name || '' });
  });
  if (smallFont.length) {
    issues.push(`\n🟡 INVOERVELDEN MET FONT < 16px (iOS zoomt in bij focus):`);
    smallFont.forEach(({ tag, fs, id }) =>
      issues.push(`   ${tag}${id ? '#' + id : ''} — ${fs}px`)
    );
  } else {
    issues.push('\n✅ Alle invoervelden hebben font-size ≥ 16px');
  }

  // ── 4. Tekst kleiner dan 12px ───────────────────────────────────────
  const textEls = document.querySelectorAll('p, li, span, a, label, td, th, h1, h2, h3, h4');
  const tinyText = [];
  textEls.forEach(el => {
    if (!el.textContent.trim()) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) tinyText.push({ tag: el.tagName, fs: fs.toFixed(1), text: el.textContent.trim().slice(0,40) });
  });
  if (tinyText.length) {
    issues.push(`\n🟡 TEKST KLEINER DAN 12px (${tinyText.length} elementen):`);
    tinyText.slice(0, 6).forEach(({ tag, fs, text }) =>
      issues.push(`   ${tag} ${fs}px — "${text}"`)
    );
  } else {
    issues.push('\n✅ Geen tekst kleiner dan 12px');
  }

  // ── Samenvatting ────────────────────────────────────────────────────
  const errors   = issues.filter(i => i.startsWith('\n🔴')).length;
  const warnings = issues.filter(i => i.startsWith('\n🟡')).length;
  issues.unshift(`\n📱 BOERENROUTE MOBILE AUDIT — viewport: ${W}px\n${'─'.repeat(50)}`);
  issues.push(`\n${'─'.repeat(50)}`);
  issues.push(`Resultaat: ${errors} fout(en), ${warnings} waarschuwing(en)`);
  if (errors === 0 && warnings === 0) issues.push('🎉 Alles ziet er goed uit!');

  console.log(issues.join('\n'));

  // Markeer overflow-elementen visueel in rood
  if (wide.length) {
    wide.forEach(({ el }) => {
      el.style.outline = '3px solid red';
      el.style.outlineOffset = '-3px';
    });
    console.log('\n🔴 Rode omlijning = elementen die buiten het scherm uitsteken. Ververs de pagina om te resetten.');
  }
})();
