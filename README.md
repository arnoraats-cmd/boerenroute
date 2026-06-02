# 🌾 Boerenroute.nl

> Vind boerderijwinkels, eierautomaten, melktaps en streekproducten bij jou in de buurt — en plan er een fietstocht omheen.

[![Live](https://img.shields.io/badge/live-boerenroute.nl-3B6D11)](https://www.boerenroute.nl)

Boerenroute.nl is een gratis platform dat lokale, verse producten rechtstreeks van de boer vindbaar maakt. Gericht op fietsers, gezinnen en iedereen die bewust en lokaal wil kopen.

## ✨ Functies

- 🔍 **Zoeken & filteren** op product, type en locatie
- 🗺️ **Interactieve kaart** met alle verkooppunten (Leaflet + OpenStreetMap)
- 🚲 **Routeplanner** met optimalisatie van de kortste route
- 📤 **Route-export** naar Garmin, Strava, Komoot, Wahoo (GPX) en Google Maps
- 🕐 **"Nu open"-filter** op basis van openingstijden
- 🌤️ **Seizoenskalender** — zie welke producten nu vers zijn
- 🎠 **Kindvriendelijke stops** (speeltuinen, kinderboerderijen) onderweg
- ❤️ **Favorieten** en boodschappenlijst → automatische route
- 📱 **Installeerbaar als app** (PWA) met offline ondersteuning
- ➕ **Crowdsourcing** — bezoekers tippen locaties, boeren melden zich aan

## 🛠️ Techniek

| Onderdeel | Keuze |
|---|---|
| Frontend | Vanilla JS (modulair) |
| Kaart | Leaflet + OpenStreetMap |
| Live data | Overpass API (OSM) |
| Geocoding | Nominatim |
| Hosting | Cloudflare Pages |
| Formulieren | Formspree |
| Statistieken | GoatCounter (privacyvriendelijk) |

## 🚀 Lokaal draaien

```bash
# Repo klonen
git clone https://github.com/<jouw-account>/boerenroute.git
cd boerenroute

# Een lokale webserver starten (kies er één)
python3 -m http.server 8000
# of
npx serve

# Open http://localhost:8000
```

> **Let op:** de PWA-installatie en service worker werken alleen via HTTPS, dus die zijn pas volledig te testen op de live site.

## 📦 Deploy

Pushen naar de `main`-branch triggert automatisch een nieuwe build op Cloudflare Pages.

```bash
git add .
git commit -m "Beschrijving van de wijziging"
git push
```

## 📂 Structuur

```
src/
├─ data/verifiedShops.json   # geverifieerde locaties
├─ map.js                    # kaart & markers
├─ shops.js                  # winkellijst, filters, sortering
├─ osm.js                    # live OSM-data
├─ route.js                  # routeplanning & GPX-export
├─ location.js               # geolocatie & geocoding
└─ ...
```

Zie `CLAUDE.md` voor de volledige projectdocumentatie en achtergrond.

## 🤝 Bijdragen

Mis je een verkooppunt? Gebruik de tip-knop op de site, of meld je winkel aan via het aanmeldformulier.

## 📜 Data & licentie

Kaartdata via [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL). Locatiegegevens deels verzameld via de Google Places API.

---

Gemaakt met 🌾 voor lokaal en ambachtelijk eten.
