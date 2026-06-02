/* ═══════════════════════════════════════════════════════════════
   season.js — seizoenskalender voor Nederlandse streekproducten
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

export function getCurrentSeason() {
  return SEASONS[new Date().getMonth() + 1];
}

export function renderSeasonPage(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const current = new Date().getMonth() + 1;
  const now     = SEASONS[current];

  el.innerHTML = `
    <div class="season-page">
      <header class="season-page-header">
        <h1 class="season-page-title">${now.icon} Seizoenskalender</h1>
        <p class="season-page-sub">Wat is er <strong>nu in ${now.label}</strong> vers van het land?</p>
      </header>

      <section class="season-now">
        <h2 class="season-now-title">Nu in het seizoen</h2>
        <div class="season-grid">
          ${now.items.map(item => `
            <div class="season-card season-card-now">
              <span class="season-item-name">${item}</span>
            </div>`).join('')}
        </div>
      </section>

      <section class="season-calendar">
        <h2 class="season-cal-title">Heel het jaar</h2>
        <div class="season-months">
          ${Object.entries(SEASONS).map(([m, data]) => {
            const isCur = +m === current;
            const isNext = +m === (current % 12) + 1;
            return `
              <div class="season-month${isCur ? ' season-month-current' : isNext ? ' season-month-next' : ''}">
                <div class="season-month-header">
                  <span class="season-month-icon">${data.icon}</span>
                  <span class="season-month-label">${data.label}</span>
                  ${isCur ? '<span class="season-month-badge">Nu</span>' : ''}
                </div>
                <div class="season-month-items">
                  ${data.items.slice(0, 6).map(i => `<span>${i}</span>`).join('')}
                  ${data.items.length > 6 ? `<span class="season-more">+${data.items.length - 6}</span>` : ''}
                </div>
              </div>`;
          }).join('')}
        </div>
      </section>
    </div>`;
}
