/* ═══════════════════════════════════════════════════════════════
   stempelkaart.js — UI voor de digitale stempelkaart
   ═══════════════════════════════════════════════════════════════ */

import {
  getRank, getAchievements, getRecentVisits,
  getCount, getVisited, clearAll, formatAge,
  exportStamps, exportStampsJSON, importStamps,
} from './stamps.js';
import { emojiIcon } from './icons.js';
import { renderProvincieKaart } from './provincie-kaart.js';

let _allShops = [];

export function initStempelkaart(shops) {
  _allShops = shops;
}

/* ══ Render hoofdpagina ══════════════════════════════════════════ */

export function renderStempelkaart(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const rank       = getRank();
  const visited    = getVisited();
  const count      = getCount();
  const achievements = getAchievements();
  const recent     = getRecentVisits(6);
  const earned     = achievements.filter(a => a.earned);
  const nextRankAt = rank.nextAt ?? rank.count;
  const progress   = rank.nextAt
    ? Math.min(100, Math.round((count - (rank.min || 0)) / (rank.nextAt - (rank.min || 0)) * 100))
    : 100;

  el.innerHTML = `
<div class="sk-page">

  <!-- ── Intro: wat is het + zo werkt het ── -->
  <header class="sk-intro">
    <h1 class="sk-intro-title"><span>🗂️</span> Mijn stempelkaart</h1>
    <p class="sk-intro-lead">
      Verzamel een stempel bij elke boerderijwinkel of automaat die je bezoekt.
      Spaar voor rangen en een echt kinderdiploma.
      <strong>Gratis &amp; zonder account</strong> — je stempels blijven privé op dit apparaat.
    </p>
    <ol class="sk-how">
      <li class="sk-how-step">
        <span class="sk-how-num">1</span>
        <span class="sk-how-text">Bezoek een boerderijwinkel, eierautomaat of melktap.</span>
      </li>
      <li class="sk-how-step">
        <span class="sk-how-num">2</span>
        <span class="sk-how-text">Open de winkel en tik op <strong>“📍 Check in”</strong>. Je telefoon controleert via GPS dat je er écht bent.</span>
      </li>
      <li class="sk-how-step">
        <span class="sk-how-num">3</span>
        <span class="sk-how-text">Je stempel verschijnt hier meteen. Hoe meer je spaart, hoe hoger je rang.</span>
      </li>
    </ol>
  </header>

  <!-- ── Rang-header ── -->
  <div class="sk-rank-card" style="--rank-color:${rank.color}">
    <div class="sk-rank-icon">${rank.icon}</div>
    <div class="sk-rank-info">
      <div class="sk-rank-title">${rank.title}</div>
      <div class="sk-rank-sub">${count} ${count === 1 ? 'stempel' : 'stempels'} verzameld</div>
    </div>
    ${rank.next ? `
    <div class="sk-rank-progress-wrap">
      <div class="sk-rank-progress-label">
        Nog <strong>${rank.nextAt - count}</strong> naar <em>${rank.next.title}</em> ${rank.next.icon}
      </div>
      <div class="sk-rank-bar" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
        <div class="sk-rank-fill" style="width:${progress}%"></div>
      </div>
    </div>` : `<div class="sk-rank-max">🎉 Maximale rang bereikt!</div>`}
  </div>

  <!-- ── Provincieverzamelaar ── -->
  <section class="sk-section" aria-label="Provincieverzamelaar">
    ${renderProvincieKaart(_allShops)}
  </section>

  <!-- ── Stempelgrid ── -->
  <section class="sk-section" aria-label="Stempelkaart">
    <h2 class="sk-section-title">
      <span>🗂️</span> Stempelkaart
      <span class="sk-count-badge">${count}</span>
    </h2>
    ${count === 0
      ? `<p class="sk-empty">Nog geen stempels. Bezoek een boerderijwinkel of automaat en klik op <strong>Check in</strong> in de winkelkaart!</p>`
      : `<div class="sk-stamp-grid" aria-label="Bezochte locaties">
          ${_stampGrid(visited)}
        </div>`
    }
  </section>

  <!-- ── Recent bezocht ── -->
  ${recent.length > 0 ? `
  <section class="sk-section" aria-label="Recent bezocht">
    <h2 class="sk-section-title"><span>🕐</span> Recent bezocht</h2>
    <ul class="sk-recent">
      ${recent.map(v => `
        <li class="sk-recent-item">
          <span class="sk-recent-emoji">${emojiIcon(v.emoji, { size: 22 })}</span>
          <div class="sk-recent-info">
            <div class="sk-recent-name">${_e(v.name)}</div>
            <div class="sk-recent-addr">${_e(v.address)}</div>
          </div>
          <span class="sk-recent-age">${formatAge(v.ts)}</span>
        </li>`).join('')}
    </ul>
  </section>` : ''}

  <!-- ── Achievements ── -->
  <section class="sk-section" aria-label="Prestaties">
    <h2 class="sk-section-title">
      <span>🏅</span> Prestaties
      <span class="sk-count-badge sk-count-amber">${earned.length}/${achievements.length}</span>
    </h2>
    <div class="sk-achievements">
      ${achievements.map(a => `
        <div class="sk-achievement ${a.earned ? 'sk-achievement-earned' : ''}" title="${_e(a.desc)}">
          <span class="sk-ach-icon">${a.icon}</span>
          <div class="sk-ach-info">
            <div class="sk-ach-title">${_e(a.title)}</div>
            <div class="sk-ach-desc">${_e(a.desc)}</div>
          </div>
          ${a.earned ? '<span class="sk-ach-check">✓</span>' : ''}
        </div>`).join('')}
    </div>
  </section>

  <!-- ── Back-up: bewaar & herstel (geen account nodig) ── -->
  <section class="sk-section sk-backup">
    <h2 class="sk-section-title"><span>💾</span> Bewaar &amp; herstel</h2>
    <p class="sk-backup-intro">Je stempels staan op dít apparaat. Maak een back-up om ze op je telefoon of een andere computer te zetten — <strong>geen account nodig</strong>.</p>
    <div class="sk-backup-actions">
      <button class="btn btn-green sk-backup-btn" id="skExportBtn">💾 Maak back-up</button>
      <button class="btn btn-ghost sk-backup-btn" id="skImportToggle">📥 Herstel van back-up</button>
    </div>

    <div class="sk-backup-panel" id="skExportPanel" hidden>
      <label class="sk-backup-label" for="skExportCode">Jouw herstelcode — kopieer 'm of download het bestand:</label>
      <textarea class="sk-backup-code" id="skExportCode" readonly rows="3"></textarea>
      <div class="sk-backup-row">
        <button class="btn btn-ghost btn-sm" id="skCopyBtn">📋 Kopieer code</button>
        <button class="btn btn-ghost btn-sm" id="skDownloadBtn">⬇️ Download bestand</button>
      </div>
    </div>

    <div class="sk-backup-panel" id="skImportPanel" hidden>
      <label class="sk-backup-label" for="skImportCode">Plak je herstelcode, of kies een back-upbestand:</label>
      <textarea class="sk-backup-code" id="skImportCode" rows="3" placeholder="Plak hier je code…"></textarea>
      <div class="sk-backup-row">
        <button class="btn btn-green btn-sm" id="skImportBtn">📥 Herstel stempels</button>
        <label class="btn btn-ghost btn-sm sk-file-label">📂 Kies bestand<input type="file" id="skImportFile" accept=".json,.txt" hidden></label>
      </div>
      <p class="sk-backup-msg" id="skImportMsg" hidden></p>
    </div>
  </section>

  <!-- ── Acties ── -->
  <section class="sk-section sk-actions-section">
    <button class="btn btn-green sk-diploma-btn" id="skDiplomaBtn">
      🎓 Genereer kinderdiploma
    </button>
    ${count > 0 ? `
    <button class="btn btn-ghost sk-clear-btn" id="skClearBtn">
      Stempelkaart wissen
    </button>` : ''}
  </section>

</div>`;

  /* Events */
  document.getElementById('skDiplomaBtn')?.addEventListener('click', openDiploma);
  document.getElementById('skClearBtn')?.addEventListener('click', () => {
    if (confirm('Weet je zeker dat je alle stempels wilt wissen? Dit kan niet ongedaan worden.')) {
      clearAll();
      renderStempelkaart(containerId);
    }
  });

  /* Back-up: bewaar & herstel */
  const exportPanel = document.getElementById('skExportPanel');
  const importPanel = document.getElementById('skImportPanel');

  document.getElementById('skExportBtn')?.addEventListener('click', () => {
    if (getCount() === 0) { alert('Je hebt nog geen stempels om te bewaren.'); return; }
    document.getElementById('skExportCode').value = exportStamps();
    importPanel.hidden = true;
    exportPanel.hidden = !exportPanel.hidden;
  });
  document.getElementById('skImportToggle')?.addEventListener('click', () => {
    exportPanel.hidden = true;
    importPanel.hidden = !importPanel.hidden;
  });

  document.getElementById('skCopyBtn')?.addEventListener('click', async () => {
    const code = document.getElementById('skExportCode').value;
    try { await navigator.clipboard.writeText(code); _flash('skCopyBtn', '✓ Gekopieerd!'); }
    catch { document.getElementById('skExportCode').select(); }
  });
  document.getElementById('skDownloadBtn')?.addEventListener('click', () => {
    const blob = new Blob([exportStampsJSON()], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: 'boerenroute-stempelkaart.json',
    });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
  });

  const doImport = (text) => {
    const msg = document.getElementById('skImportMsg');
    try {
      const added = importStamps(text);
      msg.textContent = added > 0
        ? `✅ ${added} stempel${added === 1 ? '' : 's'} hersteld!`
        : 'Niets nieuws — deze stempels had je al.';
      msg.className = 'sk-backup-msg sk-backup-ok';
      msg.hidden = false;
      setTimeout(() => renderStempelkaart(containerId), 1200);
    } catch (e) {
      msg.textContent = `❌ ${e.message}`;
      msg.className = 'sk-backup-msg sk-backup-err';
      msg.hidden = false;
    }
  };
  document.getElementById('skImportBtn')?.addEventListener('click', () => {
    doImport(document.getElementById('skImportCode').value);
  });
  document.getElementById('skImportFile')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => doImport(reader.result);
    reader.readAsText(file);
  });
}

/* Kort knop-feedbackje */
function _flash(btnId, text) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = text;
  setTimeout(() => { btn.textContent = orig; }, 1500);
}

/* ══ Stempel-grid ════════════════════════════════════════════════ */

function _stampGrid(visited) {
  const items = Object.entries(visited)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.ts - a.ts);

  /* Vul aan met lege plekken tot een mooi grid (max 30 slots zichtbaar) */
  const SHOW = Math.max(items.length + 5, 20);
  const slots = [...items, ...Array(Math.max(0, SHOW - items.length)).fill(null)];

  return slots.map((s, i) => {
    const rot = ((i * 7 + 3) % 11) - 5; // deterministisch, -5 tot +5 graden
    if (!s) {
      return `<div class="sk-stamp sk-stamp-empty" aria-hidden="true">
        <span class="sk-stamp-dot"></span>
      </div>`;
    }
    return `<div class="sk-stamp sk-stamp-filled" style="--rot:${rot}deg"
        title="${_e(s.name)}" aria-label="${_e(s.name)} bezocht">
      <span class="sk-stamp-emoji">${emojiIcon(s.emoji, { size: 24, sw: 1.8 })}</span>
      <span class="sk-stamp-name">${_short(s.name)}</span>
    </div>`;
  }).join('');
}

/* ══ Diploma ═════════════════════════════════════════════════════ */

export function openDiploma() {
  const count = getCount();
  const recent = getRecentVisits(5);
  const rank   = getRank();

  /* Overlay */
  const overlay = document.createElement('div');
  overlay.className = 'diploma-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Kinderdiploma');

  overlay.innerHTML = `
    <div class="diploma-modal">
      <button class="diploma-close" id="diplomaClose" aria-label="Sluit">&times;</button>
      <div class="diploma-preview" id="diplomaPreview">
        ${_diplomaHTML('', rank, count, recent)}
      </div>
      <div class="diploma-name-row">
        <label class="diploma-name-label" for="diplomaName">Naam kind:</label>
        <input type="text" id="diplomaName" class="diploma-name-input form-input"
          placeholder="bijv. Emma" maxlength="30" autocomplete="off">
      </div>
      <div class="diploma-actions">
        <button class="btn btn-green" id="diplomaPrint">
          🖨️ Afdrukken / Opslaan als PDF
        </button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const nameInput = overlay.querySelector('#diplomaName');
  const preview   = overlay.querySelector('#diplomaPreview');

  nameInput.addEventListener('input', () => {
    preview.innerHTML = _diplomaHTML(nameInput.value.trim(), rank, count, recent);
  });

  overlay.querySelector('#diplomaClose').addEventListener('click', () => {
    overlay.remove();
    document.body.style.overflow = '';
  });
  overlay.addEventListener('click', e => {
    if (e.target === overlay) { overlay.remove(); document.body.style.overflow = ''; }
  });

  overlay.querySelector('#diplomaPrint').addEventListener('click', () => {
    const name = nameInput.value.trim() || 'Avonturier';
    _printDiploma(name, rank, count, recent);
  });

  nameInput.focus();
}

function _diplomaHTML(name, rank, count, recent) {
  const datum = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
  const displayName = name || 'Avonturier';

  return `
<div class="diploma-doc">
  <div class="diploma-header">
    <svg class="diploma-logo" width="22" height="26" viewBox="0 0 26 30" fill="none" aria-hidden="true"><path d="M13 1.4C6.5 1.4 1.4 6.4 1.4 12.5c0 6.7 8.3 14.6 11 16.9.35.3.85.3 1.2 0 2.7-2.3 11-10.2 11-16.9C24.6 6.4 19.5 1.4 13 1.4Z" fill="#FBEFD6" stroke="#356611" stroke-width="1.7"/><path d="M13 19V9.2" stroke="#356611" stroke-width="1.7" stroke-linecap="round"/><path d="M13 14.2C9.9 14.4 7.4 12.3 7 9.4c3.1-.2 5.6 1.9 6 4.8Z" fill="#5E9420"/><path d="M13 11.4c2.6.1 4.8-1.7 5.2-4.3-2.6-.1-4.8 1.7-5.2 4.3Z" fill="#E8981C"/></svg>
    <span class="diploma-logo-text">Boeren<strong>route</strong></span>
  </div>
  <div class="diploma-body">
    <div class="diploma-type">DIPLOMA</div>
    <div class="diploma-awarded">Dit diploma wordt met trots uitgereikt aan</div>
    <div class="diploma-name">${_e(displayName)}</div>
    <div class="diploma-rank-badge">${rank.icon} ${rank.title}</div>
    <div class="diploma-text">
      voor het bezoeken van <strong>${count}</strong> ${count === 1 ? 'boerderijlocatie' : 'boerderijlocaties'}
      en het ontdekken van verse producten rechtstreeks van de boer.
    </div>
    ${recent.length > 0 ? `
    <div class="diploma-visited">
      <div class="diploma-visited-title">Bezochte locaties:</div>
      <div class="diploma-visited-list">
        ${recent.slice(0, 5).map(v => `<span>${v.emoji} ${_e(v.name)}</span>`).join('')}
      </div>
    </div>` : ''}
    <div class="diploma-seal">
      <div class="diploma-seal-inner">
        <div class="diploma-seal-text">🌾<br>ECHT<br>GEWEEST</div>
      </div>
    </div>
    <div class="diploma-date">Uitreikdatum: ${datum}</div>
    <div class="diploma-footer-text">
      Boerenroute.nl — Verse producten, rechtstreeks van de boer
    </div>
  </div>
</div>`;
}

function _printDiploma(name, rank, count, recent) {
  const datum = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
  const win = window.open('', '_blank', 'width=800,height=600');
  win.document.write(`<!DOCTYPE html><html lang="nl"><head>
<meta charset="UTF-8">
<title>Diploma — ${name} — Boerenroute.nl</title>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DM Sans', sans-serif; background: #FBF0DD; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 24px; }
.diploma { background: #FFF8EE; border: 6px double #BA7517; border-radius: 16px; padding: 40px 48px; max-width: 680px; width: 100%; text-align: center; box-shadow: 0 4px 32px rgba(0,0,0,.12); position: relative; }
.diploma::before { content: ''; position: absolute; inset: 10px; border: 1px solid rgba(186,117,23,.25); border-radius: 10px; pointer-events: none; }
.logo { font-family: 'Lora', serif; font-size: 22px; margin-bottom: 8px; }
.logo strong { color: #639922; }
.type { font-family: 'Lora', serif; font-size: 42px; font-weight: 700; color: #BA7517; letter-spacing: .12em; margin: 16px 0 8px; }
.awarded { font-size: 15px; color: #888780; margin-bottom: 6px; }
.name { font-family: 'Lora', serif; font-size: 36px; font-weight: 700; color: #27500A; margin: 8px 0 12px; }
.rank-badge { display: inline-block; background: #EAF3DE; color: #27500A; border: 1.5px solid #639922; border-radius: 999px; padding: 4px 18px; font-size: 16px; font-weight: 600; margin-bottom: 20px; }
.text { font-size: 16px; line-height: 1.7; color: #1A1A18; margin-bottom: 24px; }
.visited { background: rgba(234,243,222,.5); border-radius: 10px; padding: 14px 20px; margin-bottom: 24px; }
.visited-title { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #888780; margin-bottom: 10px; }
.visited-list { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; font-size: 14px; }
.seal { position: absolute; bottom: 36px; right: 40px; width: 80px; height: 80px; border: 4px double #BA7517; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(251,240,221,.8); color: #BA7517; font-size: 10px; font-weight: 700; text-align: center; line-height: 1.3; letter-spacing: .04em; transform: rotate(-12deg); }
.date { font-size: 13px; color: #888780; margin-top: 16px; }
.footer-text { font-size: 12px; color: #888780; margin-top: 8px; }
@media print { body { background: none; padding: 0; } .diploma { border: 6px double #BA7517; box-shadow: none; } }
</style>
</head><body>
<div class="diploma">
  <div class="logo"><svg width="20" height="23" viewBox="0 0 26 30" fill="none" style="vertical-align:-4px"><path d="M13 1.4C6.5 1.4 1.4 6.4 1.4 12.5c0 6.7 8.3 14.6 11 16.9.35.3.85.3 1.2 0 2.7-2.3 11-10.2 11-16.9C24.6 6.4 19.5 1.4 13 1.4Z" fill="#FBEFD6" stroke="#356611" stroke-width="1.7"/><path d="M13 19V9.2" stroke="#356611" stroke-width="1.7" stroke-linecap="round"/><path d="M13 14.2C9.9 14.4 7.4 12.3 7 9.4c3.1-.2 5.6 1.9 6 4.8Z" fill="#5E9420"/><path d="M13 11.4c2.6.1 4.8-1.7 5.2-4.3-2.6-.1-4.8 1.7-5.2 4.3Z" fill="#E8981C"/></svg> Boeren<strong>route</strong></div>
  <div class="type">DIPLOMA</div>
  <div class="awarded">Dit diploma wordt met trots uitgereikt aan</div>
  <div class="name">${_e(name)}</div>
  <div class="rank-badge">${rank.icon} ${rank.title}</div>
  <div class="text">voor het bezoeken van <strong>${count}</strong> ${count === 1 ? 'boerderijlocatie' : 'boerderijlocaties'}<br>en het ontdekken van verse producten rechtstreeks van de boer.</div>
  ${recent.length > 0 ? `<div class="visited"><div class="visited-title">Bezochte locaties</div><div class="visited-list">${recent.slice(0,5).map(v => `<span>${v.emoji} ${_e(v.name)}</span>`).join('')}</div></div>` : ''}
  <div class="seal">🌾<br>ECHT<br>GEWEEST</div>
  <div class="date">Uitreikdatum: ${datum}</div>
  <div class="footer-text">Boerenroute.nl — Lokaal, vers en op de fiets</div>
</div>
</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

/* ══ Helpers ═════════════════════════════════════════════════════ */

function _short(name, max = 12) {
  return name.length > max ? name.slice(0, max - 1) + '…' : name;
}

function _e(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
