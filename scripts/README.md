# Scripts

Generatoren voor statische, indexeerbare pagina's (goed voor SEO). Beide draaien op Node, zonder dependencies.

```bash
node scripts/gen-blog.mjs    # → public/blog/*.html
node scripts/gen-regio.mjs   # → public/regio/*.html
```

Draai ze opnieuw zodra de onderliggende data wijzigt, commit de output mee, en push naar `main` (Cloudflare deployt automatisch).

---

## Nieuw blogartikel toevoegen

1. **Voeg een blok toe** aan [`src/data/blog.json`](../src/data/blog.json). Formaat:

   ```json
   {
     "slug": "korte-url-naam",
     "title": "Pakkende titel",
     "emoji": "🧀",
     "date": "2026-06-15",
     "author": "Boerenroute",
     "readMinutes": 4,
     "excerpt": "Eén of twee zinnen die het artikel samenvatten.",
     "tags": ["seizoen", "zuivel"],
     "body": [
       { "type": "p",  "text": "Een gewone alinea." },
       { "type": "h2", "text": "Een tussenkop" },
       { "type": "ul", "items": ["Eerste punt", "Tweede punt"] }
     ]
   }
   ```

   - `slug` wordt de URL: `boerenroute.nl/blog/<slug>`. Gebruik kleine letters en koppeltekens, geen spaties.
   - `body` ondersteunt drie bloktypes: `p` (alinea), `h2` (tussenkop), `ul` (opsomming).
   - Tekst wordt automatisch ge-escaped — gewoon platte tekst invoeren, geen HTML.

2. **Genereer de pagina's:**

   ```bash
   node scripts/gen-blog.mjs
   ```

   Dit (her)schrijft alle `public/blog/*.html` én de overzichtspagina `public/blog/index.html`.

3. **Voeg de nieuwe URL toe** aan [`public/sitemap.xml`](../public/sitemap.xml):

   ```xml
   <url>
     <loc>https://www.boerenroute.nl/blog/korte-url-naam</loc>
     <changefreq>monthly</changefreq>
     <priority>0.7</priority>
   </url>
   ```

4. **Commit & push.** Het artikel verschijnt automatisch in de "Verhalen"-tab van de app (die leest dezelfde `blog.json`) én als losse SEO-pagina.

---

## Regiopagina's bijwerken

De regiopagina's worden gegenereerd uit [`src/data/verifiedShops.json`](../src/data/verifiedShops.json). Elke winkel wordt aan een provincie gekoppeld op basis van de **plaatsnaam** (het deel ná de laatste komma in `address`).

Na het toevoegen van nieuwe winkels:

1. Controleer of elke nieuwe plaats in de `PLACE_TO_PROV`-tabel in [`gen-regio.mjs`](./gen-regio.mjs) staat. Ontbreekt een plaats, dan belandt de winkel in "Overig" en verschijnt hij op geen enkele regiopagina.
2. Draai `node scripts/gen-regio.mjs`. De console toont per provincie het aantal winkels — controleer dat het totaal klopt en dat "Overig" leeg is.
3. Commit de bijgewerkte `public/regio/*.html` mee.

> **Tip:** om te zien of er plaatsen ontbreken, kun je tijdelijk de regel `if (prov === 'Overig') continue;` weghalen — dan logt het script ook de niet-gekoppelde plaatsen.
