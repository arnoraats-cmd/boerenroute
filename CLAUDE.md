# Boerenroute.nl

Een gratis Nederlands platform waar mensen **boerderijwinkels, eierautomaten, melktaps, zelfpluktuinen en streekproducten** in de buurt kunnen vinden en er een **fietstocht** omheen kunnen plannen. Doelgroep: 30–65 jaar, fietsers, gezinnen, en mensen die waarde hechten aan lokaal, duurzaam en ambachtelijk eten.

Live op: https://www.boerenroute.nl

---

## Doel van deze herstart

De eerste versie was één groot HTML-bestand (~3000 regels) dat organisch gegroeid is. Werkte goed, maar werd lastig te onderhouden. Deze herstart heeft als doel: **dezelfde functionaliteit, maar met een schone, modulaire structuur** zodat het project makkelijk uitbreidbaar blijft.

Belangrijk: **begin niet helemaal opnieuw met de inhoud.** Alle 94 geverifieerde locaties staan klaar in `verifiedShops.json` — die nemen we over. Het gaat puur om een betere code-organisatie.

---

## Tech-keuzes

- **Geen zware frameworks nodig.** De app is in essentie een statische site met JavaScript. Houd het simpel: vanilla JS of een lichte build (Vite) volstaat. Geen React tenzij we een goede reden hebben.
- **Hosting: Cloudflare Pages**, gekoppeld aan een GitHub-repo. Pushen naar `main` → automatische deploy. (NIET Netlify — daar liepen we tegen usage-limieten aan.)
- **Domein** `boerenroute.nl` loopt via Cloudflare DNS (account Arnoraats@gmail.com). De custom-domain-koppeling gebeurt via Workers & Pages → project → Custom Domains.
- **Kaart:** Leaflet + OpenStreetMap tiles.
- **Live winkeldata:** Overpass API (OSM) voor winkels die niet handmatig zijn toegevoegd.
- **Geocoding:** Nominatim (OSM).
- **Formulieren:** Formspree (endpoint: `https://formspree.io/f/xykvvprz`) — voor aanmeldingen, tips en nieuwsbrief.
- **Statistieken:** GoatCounter (`boerenroute.goatcounter.com`) — privacyvriendelijk, geen cookiebanner nodig.

---

## Voorgestelde projectstructuur

```
boerenroute/
├─ CLAUDE.md              ← dit bestand
├─ index.html             ← entry point, minimale HTML-shell
├─ src/
│  ├─ main.js             ← init, koppelt alles samen
│  ├─ data/
│  │  └─ verifiedShops.json   ← de 94 geverifieerde locaties (meegeleverd)
│  ├─ map.js              ← Leaflet-kaart + markers
│  ├─ shops.js            ← winkellijst renderen, filteren, sorteren
│  ├─ osm.js              ← Overpass-query + verwerking live OSM-data
│  ├─ route.js            ← routeplanning, optimalisatie, GPX-export
│  ├─ location.js         ← geolocatie + Nominatim geocoding
│  ├─ season.js           ← seizoenskalender
│  ├─ modals.js           ← detail-, tip-, export-, shoppinglist-modals
│  └─ ui.js               ← hero, pagina-navigatie, kleine helpers
├─ styles/
│  └─ main.css            ← alle styling (CSS-variabelen, huisstijl)
├─ public/
│  ├─ manifest.json       ← PWA-manifest
│  ├─ sw.js               ← service worker (offline)
│  ├─ robots.txt
│  ├─ sitemap.xml
│  ├─ og-image.png        ← social-preview (1200×630)
│  └─ icons/              ← PWA-iconen (192, 512, maskable, apple-touch)
└─ README.md
```

Pas dit gerust aan naar smaak — de kern is: **scheid data, kaart, winkels, route, en UI in losse modules.**

---

## Huisstijl

Warme, aardse, landelijke uitstraling. Sinds juni 2026 verdiept naar **bosgroen + warm-goud** (bewuste afwijking van het oorspronkelijke, blekere palet — op verzoek). CSS-variabelen:

```css
--green-dark:  #1C4109;   /* was #27500A */
--green-mid:   #356611;   /* was #3B6D11 */
--green-light: #5E9420;   /* was #639922 */
--green-bg:    #E7F0D6;   /* was #EAF3DE */
--amber:       #B8720F;   /* was #BA7517 */
--amber-light: #E8981C;   /* warmer goud, was #D4892A */
--amber-bg:    #FBEFD6;   /* was #FBF0DD */
--sand:        #F8F4EC;   /* was #F7F3EC */
--white:       #FFFFFF;
--text:        #1A1A18;
--text-mid:    #555550;
--text-light:  #888780;
--red:         #A32D2D;
```

- **Fonts:** Lora (koppen, serif) + DM Sans (tekst, sans-serif) via Google Fonts.
- **Logo:** "Boeren**route.nl**" met 🌾, waarbij "route.nl" in `--green-light`.
- **Theme color (PWA):** `#356611`.

---

## Datamodel — een verkooppunt

Elke winkel/automaat in `verifiedShops.json` heeft dit formaat:

```js
{
  id: 5,                       // uniek, oplopend nummer
  emoji: "🧀",
  name: "Siebe's Kaas",
  type: "winkel",              // winkel | automaat | zelfpluk | markt | onderweg
  premium: false,              // true = uitgelicht (betaalde plek)
  seasonal: false,             // true = seizoensgebonden aanbod
  lat: 51.6269512,
  lng: 5.6110823,
  address: "Kraanmeer 15, Erp",
  hours: "do 9.30–16u · vr 9.30–17.30u · za 9.30–16u",
  products: ["kaas", "verse melk", "geitenkaas"],
  tags: ["zuivel"],            // uit: groente, eieren, zuivel, fruit, honing, vlees, graan, kindvriendelijk
  placeId: "ChIJ...",          // Google Place ID (optioneel)
  googleRating: 4.9,           // optioneel
  googleReviews: 84,           // optioneel
  dagVers: null,               // of bv. "Verse aardbeien vandaag!" → toont badge
  desc: "Korte beschrijving in 1-2 zinnen."
}
```

OSM-geladen winkels krijgen `id` vanaf 100 (zodat ze niet botsen met de handmatige 1–94) en `osm: true`.

---

## Functies die de v1 had (overnemen)

**Kern:**
- Winkellijst met zoeken, filteren op product (tags) en type, sorteren (afstand/rating/naam).
- Leaflet-kaart met gekleurde markers per type (automaat=blauw, markt=bruin, onderweg=paars, winkel=grijs, in route=groen).
- Live OSM-data binnen instelbare straal (25/50/100/200 km) rond locatie. **Let op:** gebruik `Promise.race` voor timeouts, NIET `AbortController` (gaf "AbortSignal could not be cloned" fout). Endpoints: overpass-api.de, overpass.kumi.systems, maps.mail.ru.
- Locatie via GPS of Nominatim-geocoding. Default startpunt Uden (lat 51.6606, lng 5.6188).

**Route:**
- Stops toevoegen, nearest-neighbour optimalisatie (haversine), afstand per etappe.
- Export: GPX-download (werkt op Garmin/Strava/Komoot/Wahoo), Google Maps-link (bicycling mode), deel via WhatsApp/native share.

**Extra's:**
- "Nu open"-filter (parst Nederlandse openingstijden), favorieten (hartje), boodschappenlijst → automatische route, seizoenskalender (SEASON-object per maand).
- "Onderweg (kids)"-categorie: speeltuinen/dierentuinen/natuurgebieden uit OSM, **standaard verborgen** achter een toggle zodat winkels de hoofdmoot blijven. Het Gouden Woud (Liempde) staat er handmatig in.
- "Vandaag vers"-badge via het `dagVers`-veld.
- Tip-formulier (drijvende + knop) en winkel-aanmeldformulier, beide met honeypot tegen spam → Formspree.
- "Over ons"-pagina met uitleg, advertentietarieven (€9 badge / €15 sponsorblok / €25 sponsor+weekend), nieuwsbrief-opt-in, contact.
- Sponsorblok (huidige sponsor: Toppy.nl, `rel="noopener sponsored"`).
- PWA: installeerbaar, service worker voor offline, install-knop + iOS-hint.
- SEO: meta-tags, Open Graph, Twitter Cards, Schema.org, robots.txt, sitemap.xml.

---

## Nog te bouwen (hoge prioriteit — stonden op de roadmap)

1. **Hero + locatie-prompt bij eerste bezoek.** Compacte hero bovenaan met "Verse producten, rechtstreeks van de boer" + knoppen "📍 Vind winkels bij mij" en "🔍 Zoek een plaats". Verdwijnt zodra een locatie gekozen is. Voorkomt dat een bezoeker uit Groningen alleen Uden ziet.
2. **"Boerenroute van de maand".** Eén uitgelichte, kant-en-klare route langs 4-5 winkels die maandelijks handmatig wisselt. Met titel, afstand, stops en een "Laad deze route"-knop. Deelbaar, geeft de site een levend gevoel.
3. **Regiopagina's voor SEO.** Per provincie een echte, zichtbare en indexeerbare pagina met de winkels uit de database (naam, plaats, producten). Dit vangt long-tail zoekopdrachten als "boerderijwinkel Drenthe". **Gebruik zichtbare tekst, geen verborgen keyword-blokken** (Google straft dat af).

---

## Belangrijke lessen uit v1 (niet opnieuw in trappen)

- **Bij bulk-toevoegen van shops:** altijd controleren dat de afsluitende `];` van de array intact blijft, en daarna een JS-syntaxcheck draaien. Dit ging twee keer mis ("Unexpected identifier").
- **Geen database (Supabase) vóór er echte bezoekers zijn.** Reviews/favorieten leven nu in het geheugen; bouw persistente opslag pas wanneer er vraag naar is. De structuur moet het wél makkelijk maken om later toe te voegen.
- **Geen `localStorage`/`sessionStorage`** als de app in een sandbox-preview draait — gebruik gewone JS-variabelen voor sessiestatus.
- **Nieuwe locaties toevoegen:** vraag Claude (of gebruik de Google Places API) om naam + adres op te zoeken → exacte coördinaten, placeId, rating, openingstijden. Niet handmatig coördinaten gokken.

---

## Workflow

1. Wijzig code lokaal.
2. Test in de browser (de PWA en service worker werken alleen op HTTPS, dus volledig testen kan pas op de live site).
3. Commit & push naar GitHub `main`.
4. Cloudflare Pages bouwt en deployt automatisch.

---

## Eerste taak voor Claude Code

Zet de basisstructuur op zoals hierboven, met:
1. Een werkende `index.html` + `main.css` in de huisstijl.
2. De 94 locaties uit `verifiedShops.json` ingeladen en getoond in een winkellijst.
3. Een Leaflet-kaart met markers.
4. Daarna stap voor stap de overige modules (route, filters, OSM, modals).

Begin klein en bouw incrementeel — niet alles in één keer.
