/* ═══════════════════════════════════════════════════════════════
   stamps.js — Digitale stempelkaart
   Opslag in localStorage (privacy-vriendelijk, geen account nodig)
   ═══════════════════════════════════════════════════════════════ */

const KEY = 'br_stamps_v1';

/* ══ Opslag ══════════════════════════════════════════════════════ */

function _load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

function _save(stamps) {
  try { localStorage.setItem(KEY, JSON.stringify(stamps)); }
  catch {}
}

/* ══ Publiek API ════════════════════════════════════════════════ */

export function checkIn(shop, verified = true) {
  const stamps = _load();
  if (stamps[shop.id]) return false; // al bezocht
  stamps[shop.id] = {
    ts:       Date.now(),
    name:     shop.name,
    emoji:    shop.emoji,
    address:  shop.address,
    type:     shop.type,
    tags:     shop.tags || [],
    verified,                       // op locatie geverifieerd
  };
  _save(stamps);
  document.dispatchEvent(new CustomEvent('boerenroute:stamp', { detail: { shop } }));
  return true;
}

export function hasVisited(shopId) {
  return !!_load()[shopId];
}

export function getVisited() {
  return _load();
}

export function getCount() {
  return Object.keys(_load()).length;
}

export function clearAll() {
  try { localStorage.removeItem(KEY); } catch {}
  document.dispatchEvent(new CustomEvent('boerenroute:stamp', { detail: null }));
}

/* ══ Back-up: exporteren / herstellen (geen account, geen server) ══ */

/* Compacte, kopieerbare code (base64 van de stempels, UTF-8-veilig) */
export function exportStamps() {
  const data = { v: 1, app: 'boerenroute', stamps: _load() };
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

/* Leesbare JSON voor een downloadbaar back-upbestand */
export function exportStampsJSON() {
  return JSON.stringify({ v: 1, app: 'boerenroute', stamps: _load() }, null, 2);
}

/* Herstel uit een code (base64) óf uit de inhoud van een back-upbestand (JSON).
   Voegt samen met bestaande stempels (overschrijft niets). Geeft aantal toegevoegd terug. */
export function importStamps(input) {
  const txt = String(input || '').trim();
  if (!txt) throw new Error('Geen code opgegeven');
  let data = null;
  try { data = JSON.parse(txt); } catch {}                                   // ruwe JSON (bestand)
  if (!data) { try { data = JSON.parse(decodeURIComponent(escape(atob(txt)))); } catch {} } // base64-code
  if (!data || data.app !== 'boerenroute' || typeof data.stamps !== 'object') {
    throw new Error('Dit lijkt geen geldige Boerenroute-stempelback-up');
  }
  const cur = _load();
  let added = 0;
  for (const [id, rec] of Object.entries(data.stamps)) {
    if (rec && !cur[id]) { cur[id] = rec; added++; }
  }
  _save(cur);
  document.dispatchEvent(new CustomEvent('boerenroute:stampupdate'));
  return added;
}

/* ══ Rangensysteem ══════════════════════════════════════════════ */

const RANKS = [
  { min: 76, title: 'Boerenroute Ambassadeur', icon: '👑', color: '#BA7517' },
  { min: 51, title: 'Plattelandsverkenner',    icon: '🌾', color: '#3B6D11' },
  { min: 31, title: 'Echte Boerenfietsers',    icon: '🚴', color: '#2563EB' },
  { min: 16, title: 'Kaasliefhebber',          icon: '🧀', color: '#92400E' },
  { min: 6,  title: 'Boerschopper',            icon: '🥕', color: '#EA580C' },
  { min: 1,  title: 'Eerste Stapjes',          icon: '🌱', color: '#639922' },
  { min: 0,  title: 'Nieuwkomer',              icon: '🚜', color: '#888780' },
];

export function getRank() {
  const n = getCount();
  const rank = RANKS.find(r => n >= r.min);
  const next = RANKS[RANKS.indexOf(rank) - 1] ?? null;
  return { ...rank, count: n, next, nextAt: next?.min ?? null };
}

/* ══ Achievements ════════════════════════════════════════════════ */

const ACHIEVEMENTS = [
  {
    id: 'eier_prins',
    icon: '🥚', title: 'Eierprins/Eierkoningin',
    desc: 'Bezoek 5 eierautomaten',
    check: v => Object.values(v).filter(s => s.type === 'automaat' && s.tags.includes('eieren')).length >= 5,
  },
  {
    id: 'kaas_verslaafde',
    icon: '🧀', title: 'Kaasverslaafde',
    desc: 'Bezoek 5 kaasboerderijen',
    check: v => Object.values(v).filter(s => s.tags.includes('zuivel')).length >= 5,
  },
  {
    id: 'zelfplukker',
    icon: '🍓', title: 'Echte Zelfplukker',
    desc: 'Bezoek 3 zelfpluklocaties',
    check: v => Object.values(v).filter(s => s.type === 'zelfpluk').length >= 3,
  },
  {
    id: 'melktap_held',
    icon: '🥛', title: 'Melktap Held',
    desc: 'Bezoek 4 melktappen',
    check: v => Object.values(v).filter(s => s.tags.includes('zuivel') && s.type === 'automaat').length >= 4,
  },
  {
    id: 'verzamelaar',
    icon: '🏆', title: 'Echte Verzamelaar',
    desc: 'Bezoek alle types: winkel, automaat, zelfpluk én markt',
    check: v => {
      const types = new Set(Object.values(v).map(s => s.type));
      return ['winkel','automaat','zelfpluk','markt'].every(t => types.has(t));
    },
  },
  {
    id: 'tien_stempels',
    icon: '🎉', title: 'Tien-Stempels Feest!',
    desc: 'Verzamel 10 stempels',
    check: v => Object.keys(v).length >= 10,
  },
  {
    id: 'groente_fan',
    icon: '🥦', title: 'Groentenfanaat',
    desc: 'Bezoek 5 groenteboerderijen',
    check: v => Object.values(v).filter(s => s.tags.includes('groente')).length >= 5,
  },
  {
    id: 'honing_beer',
    icon: '🍯', title: 'Honingbeer',
    desc: 'Bezoek 3 honingverkopers',
    check: v => Object.values(v).filter(s => s.tags.includes('honing')).length >= 3,
  },
];

export function getAchievements() {
  const visited = _load();
  return ACHIEVEMENTS.map(a => ({ ...a, earned: a.check(visited) }));
}

/* ══ Hulpfuncties ════════════════════════════════════════════════ */

export function getRecentVisits(n = 5) {
  const visited = _load();
  return Object.entries(visited)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, n);
}

export function formatAge(ts) {
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)   return 'zojuist';
  if (mins < 60)  return `${mins} min geleden`;
  if (hours < 24) return `${hours} uur geleden`;
  if (days === 1) return 'gisteren';
  if (days < 7)   return `${days} dagen geleden`;
  return new Date(ts).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}
