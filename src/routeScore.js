/* ═══════════════════════════════════════════════════════════════
   routeScore.js — leidt recreatieve metrics af uit een BRouter-track.

   BRouter geeft per wegsegment WayTags (highway/surface/route_bicycle_*cn)
   en een Distance-kolom (meters). Daaruit berekenen we — zonder extra
   GIS-calls — een belevingsscore, duur, moeilijkheid en gezinsvriendelijk.
   Bij de OSRM-fallback ontbreken tags ⇒ score = null (chip verbergen).
   ═══════════════════════════════════════════════════════════════ */

const BUSY  = /^(primary|secondary|trunk|primary_link|secondary_link|trunk_link)$/;
const PAVED = /^(asphalt|paved|paving_stones|concrete|concrete:plates|sett|metal|wood)$/;

export function analyzeRoute({ distanceKm = 0, ascendM = 0, totalTimeSec = 0, messages = [], stopCount = 0 } = {}) {
  const rows = Array.isArray(messages) ? messages.slice(1) : [];
  const climbPerKm = distanceKm ? ascendM / distanceKm : 0;

  /* Duur: BRouter-tijd of schatting 15 km/u recreatief; + 12 min per winkelstop */
  const rideMin     = totalTimeSec > 0 ? totalTimeSec / 60 : (distanceKm / 15) * 60;
  const durationMin = Math.round(rideMin + stopCount * 12);

  /* Moeilijkheid uit afstand + klim per km */
  let difficulty = 'Makkelijk';
  if (distanceKm > 55 || climbPerKm > 9)      difficulty = 'Pittig';
  else if (distanceKm > 32 || climbPerKm > 5) difficulty = 'Gemiddeld';

  /* Zonder per-segment tags (OSRM-fallback): geen score/percentages */
  if (rows.length === 0) {
    return { score: null, durationMin, difficulty, family: false,
             distanceKm, ascendM,
             pctNetwork: null, pctQuiet: null, pctPaved: null, pctBusy: null };
  }

  let tot = 0, cn = 0, busy = 0, paved = 0, cycleway = 0;
  for (const r of rows) {
    const d = Number(r[3]) || 0; tot += d;
    const tags = r[9] || '';
    const hw = (tags.match(/highway=(\S+)/)  || [])[1] || '';
    const sf = (tags.match(/surface=(\S+)/)  || [])[1] || '';
    if (/route_bicycle_\wcn=yes|\b[lrn]cn=yes/.test(tags)) cn += d;
    if (hw === 'cycleway') cycleway += d;
    if (BUSY.test(hw)) busy += d;
    if (!sf || PAVED.test(sf)) paved += d;   // geen surface-tag ⇒ in NL meestal verhard
  }
  const denom = tot || 1;
  const pctNetwork  = cn / denom;
  const pctBusy     = busy / denom;
  const pctQuiet    = 1 - pctBusy;
  const pctPaved    = paved / denom;
  const pctCycleway = cycleway / denom;

  /* Belevingsscore 0–100 */
  let score = 0;
  score += pctNetwork  * 30;       // recreatief knooppunten-/LF-net
  score += pctQuiet    * 28;       // autoluw
  score += pctCycleway * 12;       // echt fietspad
  score += pctPaved    * 12;       // comfort
  score += (1 - pctBusy) * 18;     // weinig drukke weg
  score -= Math.min(climbPerKm * 1.2, 8);
  score = Math.round(Math.max(0, Math.min(100, score)));

  const family = pctQuiet > 0.8 && pctPaved > 0.9 && climbPerKm < 6 && distanceKm <= 35;

  return { score, durationMin, difficulty, family, distanceKm, ascendM,
           pctNetwork, pctQuiet, pctPaved, pctBusy };
}

/* Korte duur-weergave: "1 u 45" of "40 min" */
export function fmtDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} u ${m}` : `${h} u`;
}
