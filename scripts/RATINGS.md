# Google-ratings veilig ophalen — stap voor stap

Doel: de Google-ster­rating + aantal reviews ophalen voor de winkels die er nog geen hebben, **zonder kosten**. Je doet dit één keer, lokaal op je eigen computer.

> **De gouden regel:** een budget*waarschuwing* stopt niets — die mailt je alleen. De **échte rem is de daglimiet (quota)** op de API. Die zetten we bewust laag (stap 5). Daardoor kún je niet boven het gratis tegoed uitkomen.

Voor ~150 winkels één keer ophalen blijf je ruim binnen het gratis maandtegoed van Google → in de praktijk **€0**.

---

## Fase A — eenmalige instelling in Google Cloud

### 1. Project aanmaken
- Ga naar **console.cloud.google.com** en log in met je Google-account.
- Bovenin (projectkiezer) → **New Project** → naam bijv. `boerenroute-ratings` → **Create**.

### 2. Betaalmethode koppelen (de "spannende" stap)
- Menu (☰) → **Billing** → **Link a billing account** → **Create billing account**.
- Voeg een kaart toe. Google doet meestal een **tijdelijke controle-afschrijving van ~€0–1 die wordt teruggestort** — geen echte aankoop.
- Dit moet, want zonder billing werkt de Places API niet. De caps hieronder zorgen dat er niets in rekening wordt gebracht.

### 3. Places API (New) inschakelen
- Menu → **APIs & Services** → **Library** → zoek **"Places API (New)"** → **Enable**.

### 4. API-sleutel maken én beperken
- **APIs & Services** → **Credentials** → **Create credentials** → **API key**. Kopieer de sleutel (begint met `AIza…`).
- Klik direct op **Edit API key**:
  - **API restrictions** → **Restrict key** → vink alléén **Places API (New)** aan. (Zo kan de sleutel niets anders doen.)
  - **Application restrictions** → laat op **None** (we draaien 'm alleen lokaal en verwijderen 'm straks weer).
  - **Save**.

### 5. ⭐ Daglimiet instellen — DIT is de harde rem
- **APIs & Services** → klik op **Places API (New)** → tab **Quotas & System Limits**.
- Zoek de regel met **Requests per day** (of per minuut).
- Klik het potlood/Edit → zet de daglimiet op bijv. **300** → **Save**.
- Hierdoor stopt Google automatisch ná 300 aanvragen op een dag. 150 winkels = ~150 aanvragen, dus dat past, en een fout/loop kan nooit ontsporen.

### 6. Budgetwaarschuwing (extra vangnet, alleen een mailtje)
- Menu → **Billing** → **Budgets & alerts** → **Create budget**.
- Bedrag **€1**, drempels op **50%** en **100%** → **Finish**.
- Je krijgt nu een mail lang voordat er ook maar iets noemenswaardigs zou gebeuren.

---

## Fase B — ophalen (lokaal, met Claude erbij)

### 7. Sleutel in je terminal zetten (niet in een bestand!)
In PowerShell, in de projectmap:
```powershell
$env:GOOGLE_PLACES_KEY="AIza…JOUW_SLEUTEL"
```
> Plak de sleutel **nergens** in een bestand dat je opslaat of commit. Alleen hier in de terminal.

### 8. Testbatch (3 winkels, verandert niets)
```powershell
node scripts/fetch-ratings.mjs --limit 3
```
Dit toont per winkel wat Google teruggeeft (naam, adres, rating). Controleer samen met Claude of de matches kloppen.

### 9. Testbatch opslaan, daarna de rest
```powershell
node scripts/fetch-ratings.mjs --limit 3 --write   # eerst 3 echt opslaan
node scripts/fetch-ratings.mjs --write             # daarna alle resterende
```
De resultaten worden in `verifiedShops.json` gezet en hoeven dus nooit opnieuw opgehaald te worden.

### 10. Na afloop: de kraan dichtdraaien
- **APIs & Services** → **Credentials** → verwijder de API-key (prullenbak), **of**
- **Places API (New)** → **Disable**.
- Daarna kan er nooit meer een aanvraag (en dus kost) ontstaan.

---

## Wat kost dit echt?
- ~150 aanvragen, één keer = ruim binnen het gratis maandtegoed → **€0**.
- De daglimiet (stap 5) maakt het onmogelijk om er ongemerkt overheen te gaan.
- De sleutel staat alleen lokaal in je terminal en wordt daarna verwijderd → niets kan uitlekken.
