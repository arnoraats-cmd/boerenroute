/* Browser-safe provincie-lookup op coördinaten.
   Zelfde logica als scripts/province.mjs maar zonder Node.js-zelftest. */

export function provByCoords(lat, lng) {
  if (lng < 4.27 && lat < 51.8)                                    return 'Zeeland';
  if (lat < 51.3)                                                   return 'Limburg';
  if (lng > 5.95 && lat < 51.9)                                     return 'Limburg';
  if (lat < 51.6 && lng > 5.72)                                     return 'Limburg';
  if (lat < 51.78 && lng > 4.25 && lng < 6.0)                      return 'Noord-Brabant';
  if (lat < 52.05 && lng < 4.85)                                    return 'Zuid-Holland';
  if (lat >= 52.05 && lat < 52.3 && lng < 4.75)                    return 'Zuid-Holland';
  if (lat > 51.9 && lat < 52.3 && lng >= 4.85 && lng < 5.45)      return 'Utrecht';
  if (lat >= 52.2 && lat < 52.6 && lng >= 6.0)                     return 'Overijssel';
  if (lat < 52.45 && lng >= 5.4)                                    return 'Gelderland';
  if (lat >= 52.55 && lat < 52.85 && lng < 5.4)                    return 'Noord-Holland';
  if (lng < 5.05)                                                   return 'Noord-Holland';
  if (lat >= 52.3 && lat < 52.78 && lng >= 5.05 && lng < 5.9)     return 'Flevoland';
  if (lat >= 52.0 && lat < 52.6 && lng >= 5.9)                     return 'Overijssel';
  if (lat >= 52.8 && lng < 6.35)                                    return 'Friesland';
  if (lat >= 53.05 && lng >= 6.3)                                   return 'Groningen';
  if (lat >= 52.55 && lng >= 6.0)                                   return 'Drenthe';
  return null;
}
