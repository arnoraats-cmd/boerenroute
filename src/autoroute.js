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
   radiusFactor schaalt de selectie-straal (de tuner stelt 'm bij).
   Geeft een array shops (3–6) terug, of [] als er te weinig in de buurt is. */
export function generateRoute(shops, start, targetKm = 35, { maxStops = 8, radiusFactor = 1, sectors, variant = 0 } = {}) {
  const cand = (shops || []).filter(s =>
    s && s.type !== 'onderweg' && isFinite(s.lat) && isFinite(s.lng)
  );
  if (cand.length < 3) return [];

  // Lus-omtrek ≈ 2πr ⇒ ideale straal; winkels rond ~0.8·r geven een nette ronde.
  // De ideale straal varieert licht per variant zodat "andere route" écht anders is.
  const r        = Math.max(2, (targetKm / 6.28) * radiusFactor);
  const idealD   = r * (0.8 + ((variant % 3) - 1) * 0.07);
  const withMeta = cand.map(s => ({
    s,
    d:   haversine(start.lat, start.lng, s.lat, s.lng),
    ang: Math.atan2(s.lat - start.lat, s.lng - start.lng),
  }));

  // Winkels binnen een ruime band rond de ideale straal; anders de dichtstbijzijnde
  let pool = withMeta.filter(o => o.d <= r * 1.4);
  if (pool.length < 3) pool = withMeta.slice().sort((a, b) => a.d - b.d).slice(0, 12);
  if (pool.length < 3) return [];

  // Verdeel over hoek-sectoren → gespreide lus (geen cluster aan één kant).
  // variant roteert de sectoren + kiest een andere winkel per sector → andere lus.
  const nSectors = Math.min(maxStops, sectors || Math.max(3, Math.round(targetKm / 9)));
  const off      = variant * 1.07;                // sector-rotatie (radialen; herhaalt niet snel)
  const rank     = variant % 2;                   // 0 = beste, 1 = op één na beste
  const norm = a => { a = (a - off) % (2 * Math.PI); if (a < -Math.PI) a += 2 * Math.PI; if (a >= Math.PI) a -= 2 * Math.PI; return a; };
  const chosen   = [];
  const taken    = new Set();
  for (let k = 0; k < nSectors; k++) {
    const lo = -Math.PI + (k * 2 * Math.PI) / nSectors;
    const hi = lo + (2 * Math.PI) / nSectors;
    const inSec = pool.filter(o => { const a = norm(o.ang); return a >= lo && a < hi && !taken.has(o.s.id); });
    if (!inSec.length) continue;
    // dicht bij ideale straal + lichte voorkeur voor premium / hoog gewaardeerd
    inSec.sort((a, b) =>
      (Math.abs(a.d - idealD) - bonus(a.s)) - (Math.abs(b.d - idealD) - bonus(b.s))
    );
    const pick = inSec[Math.min(rank, inSec.length - 1)];
    chosen.push(pick.s);
    taken.add(pick.s.id);
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

/* Iteratief afstemmen op de doelafstand.
   measure(orderedShops|shops) → Promise<werkelijke lus-km> (BRouter).
   Past de selectie-straal proportioneel aan tot binnen de tolerantie.
   Geeft { picked, dist, err } van de beste poging. */
export async function generateTunedRoute(
  shops, start, targetKm = 35,
  measure,
  { tolerance = 0.12, maxIters = 3, onStep, variant = 0 } = {}
) {
  const baseSectors = Math.max(3, Math.round(targetKm / 9));
  let factor = 1, extra = 0, prev = null, best = null;

  for (let i = 0; i < maxIters; i++) {
    const picked = generateRoute(shops, start, targetKm, {
      radiusFactor: factor,
      sectors: baseSectors + extra,
      variant,
    });
    if (picked.length < 3) { if (!best) best = { picked, dist: 0, err: Infinity }; break; }

    const dist = await measure(picked);
    if (!dist) { if (!best) best = { picked, dist: 0, err: Infinity }; break; }

    const err = Math.abs(dist - targetKm) / targetKm;
    if (!best || err < best.err) best = { picked, dist, err };
    if (onStep) onStep({ iter: i + 1, dist, err });
    if (err <= tolerance) break;

    // Vastgelopen? (straal aanpassen veranderde de afstand nauwelijks)
    const stuck = prev != null && Math.abs(dist - prev) < 0.6;
    prev = dist;

    // Proportionele regeling van de straal; bij vastlopen de stop-hefboom
    factor *= targetKm / Math.max(dist, 1);
    factor = Math.min(2.4, Math.max(0.45, factor));
    if (stuck) {
      if (dist < targetKm) extra += 1;                 // te kort → stop erbij
      else if (extra > 0)  extra -= 1;                 // te lang → stop eraf
    }
  }
  return best;
}
