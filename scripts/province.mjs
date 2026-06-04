/* Provincie uit coördinaten — verfijnde boxes (incl. eilanden & lastige grenzen).
   Gedeeld door gen-regio.mjs en build-province-routes.mjs. */

export function provByCoords(lat, lng) {
  // — Zuiden —
  if (lng < 4.27 && lat < 51.8)              return 'Zeeland';            // Walcheren/Bevelanden/Schouwen/Tholen/Z-Vlaanderen
  if (lat < 51.3)                            return 'Limburg';            // Maastricht/Heuvelland/Weert-zuid
  if (lng > 5.95 && lat < 51.9)              return 'Limburg';            // Venlo/Roermond
  if (lat < 51.6 && lng > 5.72)              return 'Limburg';            // Weert e.o.
  if (lat < 51.78 && lng > 4.25 && lng < 6.0) return 'Noord-Brabant';     // onder de rivieren
  // — Randstad / midden —
  if (lat < 52.05 && lng < 4.85)             return 'Zuid-Holland';       // Den Haag/Rotterdam/Gouda/Dordrecht/Goeree
  if (lat >= 52.05 && lat < 52.3 && lng < 4.75) return 'Zuid-Holland';    // kuststrook
  if (lat > 51.9 && lat < 52.3 && lng >= 4.85 && lng < 5.45) return 'Utrecht';
  if (lat >= 52.2 && lat < 52.6 && lng >= 6.0) return 'Overijssel';       // Twente/Salland (noordelijker dan de Achterhoek)
  if (lat < 52.45 && lng >= 5.4)             return 'Gelderland';         // Betuwe/Veluwe/Achterhoek/Arnhem/Nijmegen
  // — Noorden —
  if (lat >= 52.55 && lat < 52.85 && lng < 5.4) return 'Noord-Holland';   // West-Friesland (Hoorn/Enkhuizen/Wervershoof/Medemblik)
  if (lng < 5.05)                            return 'Noord-Holland';      // west v/h IJsselmeer + Texel/Den Helder
  if (lat >= 52.3 && lat < 52.78 && lng >= 5.05 && lng < 5.9) return 'Flevoland';
  if (lat >= 52.0 && lat < 52.6 && lng >= 5.9) return 'Overijssel';       // Zwolle/Deventer/Enschede/Kampen
  if (lat >= 52.8 && lng < 6.35)             return 'Friesland';
  if (lat >= 53.05 && lng >= 6.3)            return 'Groningen';
  if (lat >= 52.55 && lng >= 6.0)            return 'Drenthe';            // Assen/Emmen/Anloo/Meppel
  return 'Overig';
}

/* Zelftest: node scripts/province.mjs */
if (process.argv[1]?.endsWith('province.mjs')) {
  const T = [
    [53.05,4.80,'Noord-Holland'],[52.96,4.76,'Noord-Holland'],[52.63,4.75,'Noord-Holland'],[52.37,4.90,'Noord-Holland'],
    [53.20,5.79,'Friesland'],[53.03,5.66,'Friesland'],[52.96,5.92,'Friesland'],
    [53.22,6.57,'Groningen'],[53.14,7.03,'Groningen'],
    [53.00,6.56,'Drenthe'],[52.78,6.90,'Drenthe'],[53.02,6.72,'Drenthe'],[52.95,6.65,'Drenthe'],[52.70,6.19,'Drenthe'],
    [52.51,6.09,'Overijssel'],[52.22,6.89,'Overijssel'],[52.25,6.16,'Overijssel'],
    [52.51,5.47,'Flevoland'],[52.37,5.22,'Flevoland'],[52.71,5.75,'Flevoland'],
    [52.09,5.12,'Utrecht'],[52.16,5.39,'Utrecht'],
    [51.98,5.91,'Gelderland'],[51.84,5.86,'Gelderland'],[52.21,5.97,'Gelderland'],[51.89,5.43,'Gelderland'],
    [52.08,4.30,'Zuid-Holland'],[51.92,4.48,'Zuid-Holland'],[52.01,4.71,'Zuid-Holland'],[51.81,4.69,'Zuid-Holland'],
    [51.50,3.61,'Zeeland'],[51.50,3.89,'Zeeland'],[51.34,3.83,'Zeeland'],[51.53,4.22,'Zeeland'],
    [51.44,5.47,'Noord-Brabant'],[51.70,5.30,'Noord-Brabant'],[51.57,4.78,'Noord-Brabant'],[51.48,5.66,'Noord-Brabant'],[51.49,4.29,'Noord-Brabant'],
    [50.85,5.69,'Limburg'],[51.37,6.17,'Limburg'],[51.25,5.71,'Limburg'],[51.19,5.99,'Limburg'],
  ];
  let ok = 0;
  for (const [la, lo, exp] of T) { const got = provByCoords(la, lo); if (got === exp) ok++; else console.log(`FOUT ${la},${lo}: ${got} (verwacht ${exp})`); }
  console.log(`${ok}/${T.length} correct`);
}
