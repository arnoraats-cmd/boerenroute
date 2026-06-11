# Boerenroute.nl

Een gratis Nederlands platform waar mensen **boerderijwinkels, eierautomaten, melktaps, zelfpluktuinen en streekproducten** in de buurt kunnen vinden en er een **fietstocht** omheen kunnen plannen. Doelgroep: 30–65 jaar, fietsers, gezinnen, en mensen die waarde hechten aan lokaal, duurzaam en ambachtelijk eten.

Live op: https://www.boerenroute.nl

---

## Status (juni 2026)

Het project is volwassen en draait live. De app is een modulaire statische site (`index.html` +
`src/*` modules) met daarnaast een **volledige programmatische SEO-laag** van statisch gegenereerde
pagina's. Concrete stand:

- **~1.638 locaties** in `src/data/verifiedShops.json` (1.414 echte verkooppunten + 224 kids-uitjes
  `type:onderweg`). Dit is de bron van waarheid voor álle gegenereerde pagina's.
- **Gegenereerde pagina's** (via `scripts/gen-*.mjs`): per provincie (`/regio/*`), per gemeente
  (`/gemeente/*`), per winkel (`/winkel/*`), per categorie (`/eierautomaten`, `/melktap`, …), per
  **categorie × provincie** (`/eierautomaten/gelderland`, …) en de blog (`/blog/*`).
- **Schone URL's** worden geserveerd via het root-bestand `_redirects` (Cloudflare Pages, status-200
  rewrites naar de echte bestanden in `/public`). Nieuwe paginatypes hebben dáár een regel nodig.
- De oude "herstart vanaf 94 locaties" is afgerond — **begin niet opnieuw**; bouw incrementeel verder.

---

## Standaarden (vastgelegd na de audit van juni 2026)

Deze afspraken zijn hard. Wijk er niet van af zonder overleg.

1. **Eén consistent locatie-getal op álle publieke pagina's.** Gebruik **"1.600+ locaties"** (1.638 ≥
   1.600 = eerlijk). Niet drie verschillende getallen zoals vroeger (hero 1.600+, over 850+, partners
   1.170+). Bij forse datagroei: het getal bewust op alle plekken tegelijk bijwerken (hero + over-sectie
   in `index.html`, stats in `public/partners/index.html`).
2. **Geen verzonnen sociaal bewijs.** Geen nep-testimonials of nep-donateurs. Sociaal bewijs moet
   **data-gedekt** zijn (bv. "580+ winkels met 4,8★+", "gem. 4,7★" — direct uit `verifiedShops.json`).
3. **Privacypagina is verplicht** (`/privacy`, AVG). Formulieren benoemen Formspree (verwerker) en
   GoatCounter (cookieloze statistiek). Footers linken naar `/privacy`.
4. **FAQ staat AAN** op categorie- én categorie×provincie-pagina's (FAQPage-schema → rich results).
5. **Beloof geen features die niet bestaan.** Controleer eerst de code (bv. het kinderdiploma in
   `src/stempelkaart.js` bestáát — dat mag beloofd worden).
6. **Programmatisch patroon:** categorie × provincie is `scripts/gen-categorie-regio.mjs`; drempel
   `MIN_COMBO = 3` (gelijkhouden met de down-link-drempel in `gen-categorie.mjs`).
7. **Blijf als expertpanel werken.** Beoordeel elke UI-/UX-wijziging door de bril van de ingehuurde
   experts (Senior UX, UI, CRO, SEO, IA, Accessibility/WCAG, Product, Frontend). Wees kritisch op
   eigen werk en benoem trade-offs.
8. **Pixel-nette afwerking is niet-onderhandelbaar.** De eindklant accepteert geen slordige uitlijning.
   Nieuwe blokken uitlijnen met het bestaande grid/de container (centreren, `max-width`, `margin auto`),
   consistente spacing/typografie, en visueel controleren vóór je het oplevert. Geen losse elementen
   die tegen een schermrand plakken.
9. **Geen lege/dode UI.** Toon filters, chips, legenda-items of secties alleen als er data voor is —
   data-gedreven (bv. een type-chip verschijnt alleen als er locaties van dat type zijn).

---

## Generatie & routing (workflow)

Na elke wijziging in `verifiedShops.json` (of in een generator) opnieuw bouwen:

```
node scripts/gen-regio.mjs            # provinciepagina's
node scripts/gen-gemeente.mjs         # gemeentepagina's
node scripts/gen-winkel.mjs           # winkel-detailpagina's
node scripts/gen-categorie.mjs        # 5 categoriepagina's (FAQ aan)
node scripts/gen-categorie-regio.mjs  # categorie × provincie (~57 pagina's)
node scripts/gen-blog.mjs             # blog + index
node scripts/gen-sitemap.mjs          # ALTIJD als laatste (leest de mappen in)
```

- **Provincie-koppeling** (plaatsnaam → provincie) staat canoniek in `scripts/place-prov.mjs`
  (`PLACE_TO_PROV`, `PROV_SLUG`, `getProvince`, `provSlug`). Nieuwe generators importeren hieruit.
  `gen-regio.mjs` en `gen-categorie.mjs` hebben nog een eigen kopie — converge die hier naartoe.
- **Nieuw paginatype = nieuwe `_redirects`-regel.** Specifieke/exacte regels boven wildcards
  (eerste match wint), bv. `/eierautomaten` vóór `/eierautomaten/*`.

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

> **Tot nu toe is alles gratis.** Nominatim, Overpass, OSRM, Formspree, GoatCounter en Cloudflare Pages draaien op gratis (tiers). Houd dat zo waar het kan.

---

## Externe API's & kosten — voorkom verrassingen (BELANGRIJK)

De eigenaar is onervaren met betaalde API's en wil **geen onverwachte kosten**. Daarom geldt voor élke koppeling met een dienst die geld kán kosten (Google Places/Maps, of welke betaalde API dan ook):

**Claude moet, vóór er ook maar één betaalde call wordt gedaan:**
1. **Duidelijk waarschuwen** dat de dienst kosten kan veroorzaken, in gewone taal — geen jargon.
2. **De kosten schatten** met een concrete rekensom (aantal calls × prijs per call) op basis van de *huidige* prijslijst (prijzen wijzigen; ga niet af op aannames).
3. **Harde limieten laten instellen** zodat een fout of lek nooit kan ontsporen:
   - In Google Cloud: een **Budget + budgetwaarschuwing** (Billing → Budgets & alerts), bijv. een alert op €1 en €5.
   - Een **quota/daglimiet** op de API (APIs & Services → Quotas) zodat het aantal calls per dag gecapt is.
4. **De API-key beveiligen:** beperk de key tot de specifieke API('s) én tot de juiste website/IP (HTTP-referrer- of IP-restrictie). Een onbeperkte key die uitlekt, kan door anderen worden misbruikt → rekening voor jou.
5. **Secrets nooit committen of in de frontend zetten.** API-keys horen niet in de repo, niet in `index.html` en niet in JS die de browser laadt. Lokaal in een `.env` of als build-secret; `.env` staat al in `.gitignore`. Voor een eenmalige klus (zoals ratings ophalen) draait de key alleen lokaal in een script, niet op de live site.

**Werkwijze bij een eenmalige bulk-klus (bv. de 147 ontbrekende Google-ratings):**
- Eerst een **testbatch van 2–3** draaien en de respons + (geschatte) kosten tonen, vóór de volle 147.
- Resultaten **wegschrijven naar `verifiedShops.json`** zodat ze nooit opnieuw opgehaald hoeven worden (geen herhaalde calls = geen herhaalde kosten).
- Een eenmalige lookup van ~150 plaatsen valt ruim binnen het gratis maandtegoed van Google; het echte risico is een **uitgelekte/onbeperkte key** of een **loop die blijft callen** — vandaar de limieten hierboven.

Korte vuistregel: **gratis tenzij echt nodig; bij betaald eerst schatten, dan caps instellen, dan pas koppelen.**

---

## Voorgestelde projectstructuur

```
boerenroute/
├─ CLAUDE.md              ← dit bestand
├─ index.html             ← entry point, minimale HTML-shell
├─ src/
│  ├─ main.js             ← init, koppelt alles samen
│  ├─ data/
│  │  └─ verifiedShops.json   ← ~1.638 geverifieerde locaties (bron van waarheid)
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

## Mobiel interactiemodel (spec)

> **Gebruik dit als checklist bij elke UI/JS-wijziging op mobiel (≤ 900px).**
> Primaire testomgeving: iOS Safari op iPhone. Safe-area (home indicator) is ~34px extra onderaan.

---

### Header (altijd zichtbaar)

`.site-header` is op mobiel `position: fixed` (niet `sticky`) — geeft altijd een zichtbare escape.  
- z-index: 100 (boven alles)
- Hoogte: 106px op mobiel (`--header-h`)  
- Inhoud: logo (link naar `/` = volledige reset naar beginscherm) + nav-tabs (Kaart · Route · Stempelkaart · Meer▾)
- `body` heeft `padding-top: var(--header-h)` zodat pagina-inhoud niet achter de header schuift
- De JS (`getHeaderH()`) leest `--header-h` en positioneert toolbar en kaart correct

---

### App-fasen

| Fase | Trigger | Zichtbaar |
|---|---|---|
| **Landing** | Eerste bezoek, nog geen locatie | Hero + banners + normale paginalayout |
| **Map-active** | Locatie gekozen (GPS of zoekveld) | `body.map-active` — kaart fullscreen, toolbar vast, bottom sheet actief |

Bij locatiekeuze: `body.classList.add('map-active')` → `activateMobileLayout()` → bottom sheet initialiseert.

---

### Bottom sheet — toestanden

Geïmplementeerd in `src/bottomsheet.js`. Drie toestanden:

| Toestand | Hoogte | Wat zichtbaar |
|---|---|---|
| `peek` | 100 px + safe-area | Sleepbalk + "Winkels" label + quicknav (Route/Stempel/Seizoen) |
| `half` | 52% schermhoogte (38% landscape) | Bovenstaande + winkellijst (gescrolld naar top) |
| `open` | `100dvh − header` | Volledig scherm, "↓ Sluit lijst"-knop zichtbaar |

**Beginstand:** `half` zodra `map-active` gezet wordt.

---

### Bottom sheet — overgangen

| Actie | Van | Naar |
|---|---|---|
| Tik op sleepgreep | peek | half |
| Tik op sleepgreep | half | open |
| Tik op sleepgreep | open | half |
| Sleep omhoog > 40 px | peek | half |
| Sleep omhoog > 60 px | half | open |
| Sleep omlaag > 60 px | half | **peek** (blijft peek — springt NIET terug) |
| Sleep omlaag > 60 px | open | half |
| Tik op kaart (niet marker) | open | half |
| Tik op kaart (niet marker) | peek | **niets** (gebruiker heeft bewust weggesleept) |
| Tik op "↓ Sluit lijst" | open | half |
| Quicknav-knop (Route/Stempel/Seizoen) | any | half + navigeert naar die sectie |

**Scroll-reset:** bij elke overgang naar `peek` of `half` scrollt `.sheet-scroll` terug naar top.  
**Map pointer-events:** alleen geblokkeerd bij `sheet-is-open` (= `open`-toestand); bij `half` en `peek` is de kaart aanraakbaar.

---

### Toolbar (vast bovenaan bij map-active)

- Positie: `fixed`, `top: var(--header-h)`, `z-index: 20`
- Rij 1: "Mijn locatie"-knop · "Afstand"-sorteerknop · "Meer filters"-knop
- Rij 2: Filterchips (Alles · Winkel · Automaat · Zelfpluk · …) — data-gedreven, alleen tonen als dat type bestaat
- **Meer filters-paneel:** opent als overlay (z-index 25), sluit bij klik buiten paneel of op overlay. Badge toont aantal actieve verborgen filters (Nu open + afwijkende OSM-straal).
- **Kids-hint:** "Met kinderen op pad? Toon speeltuinen & uitjes →" — alleen zichtbaar als `onderweg`-winkels aanwezig zijn.
- **Uitzondering route-tab:** toolbar volledig verborgen (`display: none !important`) op `data-page="route"`.

---

### Route-tab mobiel

Afwijkend layout (GEEN bottom sheet / fullscreen kaart):

- Kaart: `static`, hoogte `34vh`, `z-index: 1`
- Route-sectie eronder: scrollbaar, `max-height: calc(100dvh − header − 34vh)`
- Toolbar: verborgen

---

### Onboarding-tooltip

- Eenmalig per apparaat (`localStorage: br_onboard_v1`)
- Verschijnt direct na `map-active`, gepositioneerd boven de sheet (`bottom: calc(52% + 14px)`)
- Verdwijnt bij: klik op tooltip, klik op sheet-handle (pointerdown), of na 10 seconden
- **Nooit opnieuw tonen** na dismiss

---

### iOS-hint (PWA-installatie)

- Alleen op iOS Safari buiten standalone-modus
- Verschijnt 4 seconden na laden (of 15 s als onboarding-tooltip nog zichtbaar is)
- Auto-hide na 5 seconden; sessie-dismissed via `sessionStorage`

---

### Testchecklist (doorlopen na elke mobiele UI/JS-wijziging)

**Bottom sheet:**
- [ ] `half` → sleepgreep omhoog → `open` ✓
- [ ] `open` → sleepgreep omlaag → `half` ✓
- [ ] `half` → omlaag > 80 px slepen → `peek`, blijft peek ✓
- [ ] `peek` → tik op greep → `half` ✓
- [ ] `peek` → kaart aantikken → niets (sheet blijft peek) ✓
- [ ] `open` → kaart aantikken → `half` ✓
- [ ] Quicknav in peek: Route/Stempel/Seizoen navigeert correct ✓
- [ ] Safe-area op iPhone: onderkant sheet niet afgesneden ✓
- [ ] Landscape (hoogte < 480 px): sheet half = 38% ✓

**Toolbar/filters:**
- [ ] Meer filters-paneel opent en sluit (incl. klik buiten) ✓
- [ ] Filter badge toont correct aantal actieve verborgen filters ✓
- [ ] Filterchips: alleen zichtbaar voor types met data ✓
- [ ] Toolbar verborgen op route-tab ✓

**Kaart:**
- [ ] Marker-klik scrollt lijst naar het bijbehorende kaartje ✓
- [ ] Kaart aanraakbaar in half/peek; geblokkeerd in open ✓

**Overig:**
- [ ] Onboarding-tooltip verdwijnt na dismiss, komt niet terug ✓
- [ ] iOS-hint alleen op iOS Safari ✓

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
