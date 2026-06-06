/* ═══════════════════════════════════════════════════════════════
   autoroute.js — automatische routegeneratie.

   Kiest uit de beschikbare verkooppunten een handvol dat rond het
   startpunt een mooie, gespreide lus vormt op ~de gevraagde afstand.
   De volgorde + lussluiting + scoring gebeuren daarna in route.js/map.js.
   ═══════════════════════════════════════════════════════════════ */

function haversine(aLat, aLng, bLat, bLng) {
  const R = 6371, dLa = (bLat - aLat) * Math.PI / 180, dLo = (bLng - aLng) * Math.PI / 180;
  const x = Math.sin(dLa / 2) ** 2
    + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/* Kies winkels voor een lus van ~targetKm rond start.
   Geeft een array shops (3–6) terug, of [] als er te weinig in de buurt is. */
export function generateRoute(shops, start, targetKm = 35, { maxStops = 6 } = {}) {
  const cand = (shops || []).filter(s =>
    s && s.type !== 'onderweg' && isFinite(s.lat) && isFinite(s.lng)
  );
  if (cand.length < 3) return [];

  // Lus-omtrek ≈ 2πr ⇒ ideale straal; winkels rond ~0.8·r geven een nette ronde
  const r        = Math.max(2, targetKm / 6.28);
  const idealD   = r * 0.8;
  const withMeta = cand.map(s => ({
    s,
    d:   haversine(start.lat, start.lng, s.lat, s.lng),
    ang: Math.atan2(s.lat - start.lat, s.lng - start.lng),
  }));

  // Winkels binnen een ruime band rond de ideale straal; anders de dichtstbijzijnde
  let pool = withMeta.filter(o => o.d <= r * 1.4);
  if (pool.length < 3) pool = withMeta.slice().sort((a, b) => a.d - b.d).slice(0, 12);
  if (pool.length < 3) return [];

  // Verdeel over hoek-sectoren → gespreide lus (geen cluster aan één kant)
  const sectors = Math.min(maxStops, Math.max(3, Math.round(targetKm / 9)));
  const chosen  = [];
  const taken   = new Set();
  for (let k = 0; k < sectors; k++) {
    const lo = -Math.PI + (k * 2 * Math.PI) / sectors;
    const hi = lo + (2 * Math.PI) / sectors;
    const inSec = pool.filter(o => o.ang >= lo && o.ang < hi && !taken.has(o.s.id));
    if (!inSec.length) continue;
    // dicht bij ideale straal + lichte voorkeur voor premium / hoog gewaardeerd
    inSec.sort((a, b) =>
      (Math.abs(a.d - idealD) - bonus(a.s)) - (Math.abs(b.d - idealD) - bonus(b.s))
    );
    chosen.push(inSec[0].s);
    taken.add(inSec[0].s.id);
  }

  // Te weinig sectoren gevuld? Vul aan met dichtstbijzijnde nog niet gekozen
  if (chosen.length < 3) {
    for (const o of pool.slice().sort((a, b) => a.d - b.d)) {
      if (taken.has(o.s.id)) continue;
      chosen.push(o.s); taken.add(o.s.id);
      if (chosen.length >= 3) break;
    }
  }
  return chosen.slice(0, maxStops);
}

/* Kleine bonus (in km) voor aantrekkelijke winkels, zodat die eerder gekozen worden */
function bonus(s) {
  let b = 0;
  if (s.premium) b += 1.5;
  if ((s.googleRating || 0) >= 4.6) b += 0.8;
  return b;
}
