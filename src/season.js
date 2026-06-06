/* ═══════════════════════════════════════════════════════════════
   season.js — interactieve seizoenskalender voor NL streekproducten
   ═══════════════════════════════════════════════════════════════ */

export const SEASONS = {
  1:  { label:'Januari',   icon:'❄️',  items:['witlof','winterpeen','knolselderij','prei','spruitjes','boerenkool','rode kool','pastinaak','aardpeer','rode biet'] },
  2:  { label:'Februari',  icon:'🌬️', items:['witlof','prei','knolselderij','winterpeen','rode biet','boerenkool','pastinaak'] },
  3:  { label:'Maart',     icon:'🌱',  items:['spinazie','radijs','veldsla','prei','koolrabi','rucola','raapstelen'] },
  4:  { label:'April',     icon:'🌷',  items:['asperges','spinazie','radijs','sla','postelein','rucola','rabarber','broccoli'] },
  5:  { label:'Mei',       icon:'🌻',  items:['asperges','aardbeien','rabarber','spinazie','sla','doperwten','broccoli','bloemkool','radijs'] },
  6:  { label:'Juni',      icon:'☀️',  items:['aardbeien','frambozen','kersen','courgette','sla','komkommer','bonen','bloemkool','broccoli','doperwten'] },
  7:  { label:'Juli',      icon:'🌞',  items:['aardbeien','frambozen','bosbessen','tomaten','courgette','komkommer','paprika','bonen','uien','bloemkool'] },
  8:  { label:'Augustus',  icon:'🌾',  items:['tomaten','paprika','komkommer','courgette','bonen','bramen','pruimen','maïs','uien','knoflook','venkel'] },
  9:  { label:'September', icon:'🍂',  items:['appelen','peren','pruimen','pompoen','tomaten','maïs','courgette','venkel','rode kool','spruitjes'] },
  10: { label:'Oktober',   icon:'🍁',  items:['appelen','peren','pompoen','knolselderij','prei','rode kool','spruitjes','pastinaak','winterpeen','rode biet'] },
  11: { label:'November',  icon:'🌧️', items:['spruitjes','prei','winterpeen','knolselderij','boerenkool','witlof','pastinaak','rode biet','koolrabi'] },
  12: { label:'December',  icon:'🎄',  items:['witlof','spruitjes','prei','boerenkool','knolselderij','winterpeen','pastinaak','rode biet','appelen (bewaard)'] },
};

/* Eigen icoon per product — maakt de kalender direct scanbaar */
const PRODUCT_EMOJI = {
  'aardbeien':'🍓','frambozen':'🍇','bramen':'🍇','bosbessen':'🫐','kersen':'🍒',
  'appelen':'🍎','appelen (bewaard)':'🍎','peren':'🍐','pruimen':'🟣','pompoen':'🎃',
  'tomaten':'🍅','paprika':'🫑','komkommer':'🥒','courgette':'🥒','maïs':'🌽',
  'uien':'🧅','knoflook':'🧄','winterpeen':'🥕','pastinaak':'🥕','broccoli':'🥦',
  'bloemkool':'🥦','doperwten':'🫛','bonen':'🫛','asperges':'🌱','rabarber':'🌿',
  'venkel':'🌿','radijs':'🔴','rode biet':'🟣','aardpeer':'🥔','knolselderij':'🥔',
  'witlof':'🥬','prei':'🥬','spruitjes':'🥬','boerenkool':'🥬','rode kool':'🥬',
  'spinazie':'🥬','veldsla':'🥬','koolrabi':'🥬','rucola':'🥬','raapstelen':'🥬',
  'sla':'🥬','postelein':'🥬',
};
const emojiFor = name => PRODUCT_EMOJI[name] || '🌿';

const MONTH_ABBR = ['J','F','M','A','M','J','J','A','S','O','N','D'];

/* Reverse-index: product → set van maanden waarin het in seizoen is */
function buildAvailability() {
  const map = {};
  for (const [m, data] of Object.entries(SEASONS)) {
    for (const it of data.items) {
      const key = it.replace(' (bewaard)', '');
      (map[key] ||= new Set()).add(+m);
    }
  }
  return map;
}

export function getCurrentSeason() {
  return SEASONS[new Date().getMonth() + 1];
}

/* Zoek dit product op de kaart (deep-link naar de zoekfilter) */
function findProduct(name) {
  const clean = name.replace(' (bewaard)', '');
  const input = document.getElementById('searchInput');
  if (input) {
    input.value = clean;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  document.querySelector('.nav-btn[data-page="kaart"]')?.click();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function renderSeasonPage(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const current = new Date().getMonth() + 1;
  let selected  = current;
  const avail   = buildAvailability();

  /* Mini-beschikbaarheidsbalk: 12 segmenten, gevuld = in seizoen */
  const availBar = (name) => {
    const months = avail[name.replace(' (bewaard)', '')] || new Set();
    return `<span class="season-availbar" aria-label="Beschikbaar in ${months.size} maanden">${
      MONTH_ABBR.map((ltr, i) => {
        const m = i + 1;
        const on = months.has(m);
        const cur = m === current;
        return `<span class="sab${on ? ' sab-on' : ''}${cur ? ' sab-cur' : ''}" title="${SEASONS[m].label}">${ltr}</span>`;
      }).join('')
    }</span>`;
  };

  /* Productenraster voor de gekozen maand */
  const panelHTML = (m) => {
    const data = SEASONS[m];
    const isNow = m === current;
    return `
      <div class="season-panel-head">
        <span class="season-panel-icon">${data.icon}</span>
        <h2 class="season-panel-title">${isNow ? 'Nu in het seizoen' : `Vers in ${data.label}`}</h2>
        <span class="season-panel-count">${data.items.length} producten</span>
      </div>
      <div class="season-grid">
        ${data.items.map((item, idx) => `
          <button class="season-card" data-product="${item}" style="--i:${idx}"
                  aria-label="Vind ${item} bij jou in de buurt">
            <span class="season-card-emoji">${emojiFor(item)}</span>
            <span class="season-card-name">${item}</span>
            ${availBar(item)}
            <span class="season-card-find">📍 Vind dichtbij</span>
          </button>`).join('')}
      </div>`;
  };

  el.innerHTML = `
    <div class="season-page">
      <header class="season-page-header">
        <h1 class="season-page-title">Seizoenskalender</h1>
        <p class="season-page-sub">Klik op een maand en ontdek wat er <strong>vers van het land</strong> komt. Tik een product om het bij jou in de buurt te vinden.</p>
      </header>

      <nav class="season-monthstrip" aria-label="Kies een maand">
        ${Object.entries(SEASONS).map(([m, d]) => {
          const mn = +m;
          return `<button class="season-mchip${mn === current ? ' is-current' : ''}${mn === selected ? ' is-active' : ''}"
                    data-month="${mn}" aria-pressed="${mn === selected}">
                    <span class="season-mchip-icon">${d.icon}</span>
                    <span class="season-mchip-label">${d.label.slice(0,3)}</span>
                    ${mn === current ? '<span class="season-mchip-dot" title="Huidige maand"></span>' : ''}
                  </button>`;
        }).join('')}
      </nav>

      <section class="season-panel" id="seasonPanel">${panelHTML(selected)}</section>
    </div>`;

  /* ── Interactie ──────────────────────────────────────────────── */
  const panel = el.querySelector('#seasonPanel');
  const chips = el.querySelectorAll('.season-mchip');

  function paint() {
    panel.innerHTML = panelHTML(selected);
    chips.forEach(c => {
      const on = +c.dataset.month === selected;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', String(on));
    });
    bindProducts();
  }

  function bindProducts() {
    panel.querySelectorAll('.season-card').forEach(card =>
      card.addEventListener('click', () => findProduct(card.dataset.product))
    );
  }

  chips.forEach(chip =>
    chip.addEventListener('click', () => {
      selected = +chip.dataset.month;
      paint();
      chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    })
  );

  bindProducts();
}
