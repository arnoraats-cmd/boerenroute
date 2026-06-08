/* Canonieke koppeling plaatsnaam → provincie + provincie-slugs.
   Bron van waarheid voor de programmatische pagina's. De oudere generators
   (gen-regio.mjs, gen-categorie.mjs) hebben elk nog een eigen kopie; nieuwe
   code importeert vanaf hier. Converge die later naar dit bestand. */
import { provByCoords } from './province.mjs';

export const PLACE_TO_PROV = {
  // ── Noord-Brabant ──────────────────────────────────────────────
  'Aarle-Rixtel':'Noord-Brabant','Asten':'Noord-Brabant','Best':'Noord-Brabant',
  'Beek en Donk':'Noord-Brabant','Berlicum':'Noord-Brabant','Biezenmortel':'Noord-Brabant',
  'Bladel':'Noord-Brabant','Boekel':'Noord-Brabant','Boxtel':'Noord-Brabant',
  'Breda':'Noord-Brabant','Budel':'Noord-Brabant','Casteren':'Noord-Brabant',
  'De Moer':'Noord-Brabant','Den Dungen':'Noord-Brabant','Deurne':'Noord-Brabant',
  'Diessen':'Noord-Brabant','Dongen':'Noord-Brabant','Drunen':'Noord-Brabant',
  'Eerde':'Noord-Brabant','Eindhoven':'Noord-Brabant','Elshout':'Noord-Brabant',
  'Erp':'Noord-Brabant','Etten-Leur':'Noord-Brabant','Genderen':'Noord-Brabant',
  'Goirle':'Noord-Brabant','Halsteren':'Noord-Brabant','Haaren':'Noord-Brabant',
  'Heesch':'Noord-Brabant','Heeswijk-Dinther':'Noord-Brabant','Heeze':'Noord-Brabant',
  'Helmond':'Noord-Brabant','Helvoirt':'Noord-Brabant','Heerle':'Noord-Brabant',
  'Heukelom':'Noord-Brabant','Hilvarenbeek':'Noord-Brabant',
  'Hoogeloon':'Noord-Brabant','Hooge Zwaluwe':'Noord-Brabant',
  'Knapersven 36, Mariahout':'Noord-Brabant',
  'Liempde':'Noord-Brabant','Lithoijen':'Noord-Brabant','Loon op Zand':'Noord-Brabant',
  'Maarheeze':'Noord-Brabant','Made':'Noord-Brabant','Mariahout':'Noord-Brabant',
  'Maren-Kessel':'Noord-Brabant','Moergestel':'Noord-Brabant',
  'Nistelrode':'Noord-Brabant','Nuenen':'Noord-Brabant','Nuland':'Noord-Brabant',
  'Oirschot':'Noord-Brabant','Oisterwijk':'Noord-Brabant','Ommel':'Noord-Brabant',
  'Oosterhout':'Noord-Brabant','Oss':'Noord-Brabant',
  'Oost West en Middelbeers':'Noord-Brabant',
  'Reek':'Noord-Brabant','Riel':'Noord-Brabant','Rijkevoort':'Noord-Brabant',
  'Rosmalen':'Noord-Brabant','Rucphen':'Noord-Brabant',
  'Schijndel':'Noord-Brabant','Sint-Michielsgestel':'Noord-Brabant',
  'Sint-Oedenrode':'Noord-Brabant','Soerendonk':'Noord-Brabant','Someren':'Noord-Brabant',
  'Son en Breugel':'Noord-Brabant','Sprundel':'Noord-Brabant',
  'Tilburg':'Noord-Brabant','Uden':'Noord-Brabant','Udenhout':'Noord-Brabant',
  'Ulicoten':'Noord-Brabant','Veghel':'Noord-Brabant','Veldhoven':'Noord-Brabant',
  'Vinkel':'Noord-Brabant','Vlijmen':'Noord-Brabant','Volkel':'Noord-Brabant',
  'Vught':'Noord-Brabant','Waspik':'Noord-Brabant','Wintelre':'Noord-Brabant',
  'Zeeland':'Noord-Brabant',"'s-Hertogenbosch":'Noord-Brabant',
  'Bergen op Zoom':'Noord-Brabant',

  // ── Gelderland ─────────────────────────────────────────────────
  'Arnhem':'Gelderland','Barneveld':'Gelderland','Culemborg':'Gelderland',
  'Diepenveen':'Gelderland','Doorwerth':'Gelderland','Dreumel':'Gelderland',
  'Haaften':'Gelderland','Harskamp':'Gelderland','Hedel':'Gelderland',
  'Overasselt':'Gelderland','Rha':'Gelderland','Rossum':'Gelderland',
  'Spankeren':'Gelderland','Spijk':'Gelderland','Toldijk':'Gelderland',
  'Velddriel':'Gelderland','Vierakker':'Gelderland','Vorden':'Gelderland',
  'Vragender':'Gelderland','Wageningen':'Gelderland','Wilp':'Gelderland',

  // ── Utrecht ────────────────────────────────────────────────────
  'Bunnik':'Utrecht','De Hoef':'Utrecht','Groenekan':'Utrecht',
  'Leusden':'Utrecht','Woudenberg':'Utrecht',
  'Utrecht (De Meern)':'Utrecht','Utrecht (Haarzuilens)':'Utrecht',
  'Waverveen':'Utrecht',

  // ── Noord-Holland ──────────────────────────────────────────────
  'Amsterdam':'Noord-Holland','Avenhorn':'Noord-Holland',
  'Den Helder':'Noord-Holland','Egmond aan den Hoef':'Noord-Holland',
  'Grosthuizen':'Noord-Holland','Schagerbrug':'Noord-Holland',
  'Stompetoren':'Noord-Holland','Warmenhuizen':'Noord-Holland',
  'Wervershoof':'Noord-Holland','Zuidschermer':'Noord-Holland',

  // ── Zuid-Holland ───────────────────────────────────────────────
  'Alphen aan den Rijn':'Zuid-Holland','Benthuizen':'Zuid-Holland',
  'Bergschenhoek':'Zuid-Holland','Delfgauw':'Zuid-Holland',
  'Den Bommel':'Zuid-Holland','Rhoon':'Zuid-Holland','Wassenaar':'Zuid-Holland',

  // ── Zeeland ────────────────────────────────────────────────────
  'Aagtekerke':'Zeeland','Arnemuiden':'Zeeland','Kattendijke':'Zeeland',
  'Kerkwerve':'Zeeland','Koudekerke':'Zeeland','Lewedorp':'Zeeland',
  'Nieuwerkerk':'Zeeland','Oud-Vossemeer':'Zeeland','Schoondijke':'Zeeland',
  'Tholen':'Zeeland',

  // ── Limburg ────────────────────────────────────────────────────
  'Eckelrade':'Limburg','Heerlen':'Limburg','Kessel':'Limburg',
  'Maria Hoop':'Limburg','Mechelen':'Limburg','Neer':'Limburg',
  'Schin op Geul':'Limburg','Sevenum':'Limburg','Spaubeek':'Limburg',
  'Velden':'Limburg','Weert':'Limburg','Ysselsteyn':'Limburg',

  // ── Overijssel ─────────────────────────────────────────────────
  'Bruchterveld':'Overijssel','Dalfsen':'Overijssel','Dalmsholte':'Overijssel',
  'Enschede':'Overijssel','Glane':'Overijssel','Hertme':'Overijssel',
  'Wierden':'Overijssel','Zwolle':'Overijssel',

  // ── Flevoland ──────────────────────────────────────────────────
  'Dronten':'Flevoland','Emmeloord':'Flevoland',
  'Lelystad':'Flevoland','Zeewolde':'Flevoland',

  // ── Groningen ──────────────────────────────────────────────────
  'Bedum':'Groningen','Bierum':'Groningen','Den Horn':'Groningen',
  'Marum':'Groningen','Mussel':'Groningen',"'t Zandt":'Groningen',
  'Trimunt':'Groningen','Winsum':'Groningen',

  // ── Friesland ──────────────────────────────────────────────────
  'Burgum':'Friesland','Makkum':'Friesland','Noordwolde':'Friesland',
  'Oosterwolde':'Friesland','Siegerswoude':'Friesland',
  'Twijzel':'Friesland','Tzum':'Friesland',

  // ── Drenthe ────────────────────────────────────────────────────
  'Beilen':'Drenthe','Doldersum':'Drenthe','Geesbrug':'Drenthe',
  'Grolloo':'Drenthe','Nijeveen':'Drenthe','Peize':'Drenthe',
  'Ruinerwold':'Drenthe','Zuidveld':'Drenthe',
};

export const PROV_SLUG = {
  'Noord-Brabant': 'noord-brabant',
  'Gelderland': 'gelderland',
  'Utrecht': 'utrecht',
  'Noord-Holland': 'noord-holland',
  'Zuid-Holland': 'zuid-holland',
  'Zeeland': 'zeeland',
  'Groningen': 'groningen',
  'Friesland': 'friesland',
  'Drenthe': 'drenthe',
  'Overijssel': 'overijssel',
  'Flevoland': 'flevoland',
  'Limburg': 'limburg',
};

/** Plaatsnaam uit een adres ("Straat 1, Plaats" → "Plaats"). */
export function placeOf(shop) {
  return String(shop.address ?? '').replace(/^.*,\s*/, '').trim();
}

/** Provincie van een shop: plaatsnaam-map eerst, anders op coördinaten. */
export function getProvince(shop) {
  return PLACE_TO_PROV[placeOf(shop)] ?? provByCoords(shop.lat, shop.lng);
}

export function provSlug(prov) {
  return PROV_SLUG[prov] ?? prov.toLowerCase().replace(/[^a-z]/g, '-');
}
