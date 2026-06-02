/* ═══════════════════════════════════════════════════════════════
   location.js — geolocatie + Nominatim geocoding
   Promise.race voor timeouts (geen AbortController — zie CLAUDE.md)
   ═══════════════════════════════════════════════════════════════ */

export const DEFAULT = { lat: 51.6606, lng: 5.6188, name: 'Uden' };

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const TIMEOUT_MS = 6000;

/**
 * Geocodeer een tekstquery naar { lat, lng, name }.
 * Gooit een Error als er geen resultaat is of bij timeout.
 */
export async function geocode(query) {
  if (!query?.trim()) throw new Error('Lege zoekopdracht');

  const params = new URLSearchParams({
    q:               query.trim(),
    countrycodes:    'nl',
    limit:           '1',
    format:          'json',
    'accept-language': 'nl',
  });

  const fetchPromise = fetch(`${NOMINATIM}?${params}`, {
    headers: { 'User-Agent': 'Boerenroute.nl/2.0 (arnoraats@gmail.com)' },
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Zoekservice reageert niet (timeout)')), TIMEOUT_MS)
  );

  const response = await Promise.race([fetchPromise, timeoutPromise]);

  if (!response.ok) throw new Error(`Zoekservice geeft foutcode ${response.status}`);

  const results = await response.json();
  if (!results.length) throw new Error(`"${query}" niet gevonden`);

  const { lat, lon, display_name } = results[0];
  return {
    lat:  parseFloat(lat),
    lng:  parseFloat(lon),
    name: display_name.split(',')[0].trim(),
  };
}

/**
 * Vraag GPS-locatie op.
 * Geeft { lat, lng } of gooit een Error.
 */
export function getGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocatie wordt niet ondersteund door deze browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      err => {
        const msgs = {
          1: 'Locatietoegang geweigerd',
          2: 'Locatie niet beschikbaar',
          3: 'Locatie ophalen duurde te lang',
        };
        reject(new Error(msgs[err.code] ?? 'Onbekende locatiefout'));
      },
      { timeout: 10000 }
    );
  });
}
