/* Eenmalige check: staan deze adressen al in verifiedShops.json? */
import { readFileSync, writeFileSync } from 'fs';

const queries = `
Boerderij Hoogenraad|Werkhoven
Stadstuin Plutodreef|Utrecht
De Fruithut Zeist|De Bilt
Boer Peter|Haarzuilens
Ijsboerderij De Morgen|Montfoort
Natuurboerderij KipEigen|Loosdrecht
De Fruitschuur - Gerrit van Tienhoven|Lexmond
Oogst Woerden|Woerden
Van Vliet vlees|Oudewater
Bij Ons boerderijwinkel & kaasmakerij|Doorn
Boer met Lust|Woerden
Biologische Tuinderij de Elzenkamp|Amersfoort
De Nieuwe Graanschuur|Amersfoort
Villa Kakelbont|Langbroek
Klaasse Bos|Zevenhoven
Heerlijkheid Marienwaerdt Biologisch Landgoedwinkel|Beesd
Valleivlees|Woudenberg
Leo Akkerman Bloemen Planten VOF|Beesd
Boerderij de Oude Ruif|Stoutenburg
Oogst van eigen erf|Stoutenburg
Boomgaard de Lekbongerd|Schoonhoven
Tuinderij Land in Zicht|Amersfoort
Melkveebedrijf t Broek|Woudenberg
Zorgboerderij Inner-Art|De Kwakel
Tuinderij Vosbeek|Scherpenzeel
IJsboerderij De Oude Schuur|Vuren
Kaasboerderij en Landwinkel Vanelly|Barneveld
Odin Almere Vliervelden|Almere
Het Wildhuys|Berkenwoude
Bij Boer Berends|Lienden
Visserij De Waard|Lekkerkerk
Mariahoeve's Melkhuisje|Woubrugge
Familie Bos KALFSVLEES|Barneveld
IJs van boer Gijs|Rhenen
IJsboerderij t Koeiestalletje|Wijngaarden
Melktap Bloemplaat Hoeve Melk en Meer|Almkerk
Kaasboerderij De Lange Hoeve|Genderen
Koeboer to go|Ermelo
Eco Fields|Wekerom
Oogst Leiden|Leiden
Vroegop Randwijk VOF|Randwijk
Hof Eyghentijds|Rosmalen
VersvandenAkker|Vlijmen
Het ijs en taart moment|Vlijmen
Biogroentebezorging.nl|Berkel en Rodenrijs
Knedo Stables|Wijdewormer
Lamsvlees van de Boer|Heteren
Waterland Brewery biologische bierbrouwerij|Purmerend
Boerderij Sinneveld|Santpoort-Zuid
Hortus groente en fruit|Winssen
De Stoofaalspecialiste|Jisp
Het Groene Buitenland|Assendelft
Sprankenhof|Udenhout
Plukhoek Mookhoek|Mookhoek
Bij Moeders in De Kosterij|Middenbeemster
Imkerij BijDaan|Hoenderloo
Buitenlust|Vught
De Grote Wiede|Hulshorst
Waterlant's Weelde Natuurvlees|Oosthuizen
Verkooppunt Eieren|Nunspeet
Boerderij De Groene Oerbron|Uitgeest
De Duiventoren|Dorst
Jan's Boeren softijs|Wijchen
t Haarens ijsboerke|Haaren
Buffelcompany|Oudendijk
De Grote Bredelaar|Elst
De nieuwe Schatkuil|Overasselt
ZwamBoon|Apeldoorn
Bloezm|Veghel
t IJsboerinneke|Moergestel
The Westerfields Homesteading Products|Vaassen
Domein de Vier Ambachten|Simonshaven
De Groentedocter|Elburg
Jam en Zo|Oosterblokker
BesTFruit|Zuidland
Camperkampeerplaats De Grote Leigraaf|Klarenbeek
B&J Meat|Sint-Oedenrode
Lievegoed De Beukenhof|Breda
De Duroc Hoeve|Son en Breugel
Bio Groenten|Goudswaard
Hoeve De Ruimer CV|Klarenbeek
BoerJoep.nl|Egmond aan den Hoef
Boeren softijs Rommens Koeien|Hoeven
De Bresser Poultry|Best
Kwekerij Eeuwhorst|Emst
Vermeulen Melkvee|Sint Hubert
Fam. Van der schoot|Chaam
Bakkums Boetje|Heerhugowaard
Dutch Barrel Ranch|Opmeer
Brouwerij Artemis en Haegens Distillery|Dronten
Aardappelautomaat Hanekamp|Terwolde
Boerderij de Bontekoe|Sprundel
Boeren streek winkel DE WOLF|Terwolde
Bij Ons Boerderijterras|Baarle-Nassau
Blije Buiten Beesten|Rucphen
De Bosslag Tuinderij|Didam
Baarles ei|Baarle-Nassau
Rennestreekproducten|Nagele
Bakerweerd|Brummen
De IJsboerin|Rockanje
Melktap Laag-Zalk|Kamperveen
NewBee Honing|Wervershoof
Sunny Soaps|Didam
Jongenelen puur natuur rundvlees|Klein-Zundert
By Senna|Zundert
Belevingsboerderij Veldzicht Hoeve|t Veld
Barbekoe Brabants Black Angus vlees|Wintelre
Mooy Microgreens|Deventer
Besteljeaardappel.nl|Kampen
Kalterra Beleving|IJsselmuiden
Typisch Kim|Helmond
Plukken bij Het|IJsselmuiden
Wou Zuivelautomaat Melk- en IJstap|Stellendam
De Beestenboel van Verweij|Dirksland
De Buurman VersLokaal|Zwolle
Kloas in t Hof|Bathmen
Kaas & delicatesse Den4akker|Vorden
Van Sinckel|Vorden
Lekker en gezond|Doetinchem
Epze zeep maar dan anders|Zelhem
Groentekraam Kraggenburg|Kraggenburg
Boerderijwinkel de Rietstulp|Mastenbroek
Boerderij de Zuiderkrib|Kraggenburg
Zeeuwsche Zoute|Bruinisse
De Stelhoek|Oud-Vossemeer
Welig bessenpluk en theetuin|Lochem
Boerderijautomaat Ommel|Ommel
Uut Zellum|Zelhem
Decohof kwekerij en pluktuin|Dalfsen
JP Food kipautomaat|Someren
Vleesch.nl|Asten
Jersey koeien Klein Slendebroek|Dalfsen
Verhage Fruit|Luttelgeest
Plukpolder|Dreischor
Tulpenpluktuin|Marknesse
Boerderijwinkel Keetenburgh|Callantsoog
De Heikamp|Ruurlo
De Achterhoekse Kempen|Westendorp
Tuinkraam|Luttelgeest
Vleis van Striebos|Castenray
t Vreebroek|Laren
Kloas in t Hof|Holten
Aardbeien Kwekerij Bosch|Luttenberg
Jonenpad Hoeve|Blokzijl
Eibezorgd.nl|Dalfsen
Boer Lubbers|Sinderen
Limousinbedrijf Van Lievenoogen Soerendonk|Soerendonk
Limousinbedrijf Van Lievenoogen Gastel|Gastel
Boer Ben|Dalfsen
Biologisch boerenbedrijf Erve Meijerink|Vilsteren
Pelslap eitjes|Horst
Theebrouwerij|Geesteren
Imkerij jan schaapman|Meppel
Dutch Seaweed Group|Yerseke
Zorgboerderij Tusken Bosk en Mar|Ypecolsga
Boerderij Boodschappen|Diepenheim
Het Buurtkupertje|Neede
Beeffet Steenwijk|Steenwijk
Bij Ons op Hommelink|Lievelde
Veltkamp|Eibergen
Ons Zeeuws Fruit Eversdijk|Kapelle
De Sjroetefarm|Helden
Middenhof|Goes
Blij van de Boerderij|Vragender
De Oorsprong uut Drenthe in Koekange|Koekange
IJsboerderij t Olde Pietepol|Aalten
Boerderijwinkel De Heerlijke Huiskamer|Ambt Delden
Stokkers-Stegeman|Haaksbergen
Zoetebredero voeding&zo|Graauw
Fruithof de Struikrover|Oldeholtpade
Leffertstra pleats|Akmarijp
Het Stalletje onder aan de Dijk|Geersdijk
Fwr vlees|Ruinen
t Foart|Schettens
Pluktuin Landgoed De Zonnebloem|Winterswijk Brinkheurne
Hoeve Sonneclaer|Fluitenberg
t Hedevelds Bio Ei Boerderijwinkel t Hedeveld|Hertme
De Bessentuin|Brucht
Fokkerijbedrijf ter Mors|Haaksbergen
Boerderijautomaat Elenbaas|Lewedorp
The Holy Spiritus|Sint Jansteen
Koeien van Jelle|Enschede
Mastermeat|Lutten
Hettinga Arum|Arum
Koelmans kaas|Haaksbergen
Puur Vlees|Elim
Chocomaat|Achlum
Boeren in het Bos|Nijeberkoop
Kaasmakerij de Kiefte|Holtheme
Eierautomaat Booijink|Wijster
Longhorn Ranch Hasthem Hoeve|Baijum
De Koeien van Sinnige|Appelscha
De IJsbarones|Holthone
Aardappelen bij Bos|Wijster
Zuivelboerderij Holterhof streekwinkel|Enschede
Melktap Jellum|Jellum
Onze winkel|Fochteloo
Eieren van Verhulst|Westkapelle
Erfgoed Bossem|Lattrop-Breklenkamp
De Slotplaats|Bakkeveen
Mooyland Cider|Benneveld
Dekema State|Jelsum
Maatschap de Vlieger|Groede
Kaaslust|Veenhuizen
De Zomerschuur|Burgum
Hoeve Hoogland|Drogeham
Boer'n Jonker|Jonkersvaart
Heidi's Melktap en fiets wandel rustpunt|Steenbergen
Drents Gruun|Eesergroen
Belevingstuin D'r Moostuin|Berg en Terblijt
De Landwinkel|Eys
De Moalderij|Anloo
Slagerij van Wijk Longhornbeef Boerderijwinkel|Niekerk
Mts. Timpelsteed|Engwierum
Kaasboerderij de Marlannen|Jouswier
Vleesatelier Kuusj & Ko|Mechelen
Hoeve Schaffersberg Natuurvallei|Mechelen
Slagerij de Buurderij|Noordlaren
Groentekwekerij Noordlaren|Noordlaren
Rianne's Boerderij IJs|Niehove
Geitenhouderij Ter Veen|Groningen
De Wiershoeck Natuurvoeding|Groningen
Het Westerwoldse varken|Onstwedde
Boeket Garni|Vlagtwedde
Eieren van Boerderij Lalkens|Woltersum
Brouwerij Westerwolde|Vlagtwedde
Lily Cakes|Oudeschans
`.trim().split('\n').map(l => { const [name, town] = l.split('|'); return { name, town }; });

const shops = JSON.parse(readFileSync('src/data/verifiedShops.json', 'utf8'));

const STOP = new Set(['de','het','een','van','en','der','den','aan','op','in','bij','boerderij','boerderijwinkel','winkel','hoeve','automaat','boer','vof','cv','mts','the','of','t','ijsboerderij','kaasboerderij','melktap','zorgboerderij','tuinderij','kwekerij','slagerij','imkerij','brouwerij']);
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const toks = s => norm(s).split(' ').filter(w => w.length > 2 && !STOP.has(w));
const townOf = s => norm((s.address.split(',').pop()||'').replace(/\d{4}\s?[a-z]{2}/i,''));

const shopData = shops.map(s => ({ s, tk: new Set(toks(s.name)), town: townOf(s) }));

const inDb = [], maybe = [], nieuw = [];
for (const q of queries) {
  const qt = toks(q.name), qtown = norm(q.town);
  let best = null, bestScore = 0;
  for (const sd of shopData) {
    const shared = qt.filter(t => sd.tk.has(t)).length;
    const townMatch = qtown && sd.town && (sd.town.includes(qtown) || qtown.includes(sd.town));
    let score = shared * 2 + (townMatch ? 1.5 : 0);
    if (score > bestScore) { bestScore = score; best = { sd, shared, townMatch }; }
  }
  if (best && best.shared >= 1 && best.townMatch)      inDb.push([q, best]);
  else if (best && (best.shared >= 2 || (best.shared >= 1 && best.townMatch))) maybe.push([q, best]);
  else nieuw.push(q);
}

console.log(`\n=== AL AANWEZIG (${inDb.length}) ===`);
inDb.forEach(([q,b]) => console.log(`  ✓ ${q.name} (${q.town})  →  #${b.sd.s.id} ${b.sd.s.name}`));
console.log(`\n=== MOGELIJK AL AANWEZIG — controleer (${maybe.length}) ===`);
maybe.forEach(([q,b]) => console.log(`  ? ${q.name} (${q.town})  →  #${b.sd.s.id} ${b.sd.s.name}`));
console.log(`\n=== WAARSCHIJNLIJK NIEUW (${nieuw.length}) ===`);
nieuw.forEach(q => console.log(`  + ${q.name} (${q.town})`));
console.log(`\nTotaal gecontroleerd: ${queries.length} | al: ${inDb.length} | mogelijk: ${maybe.length} | nieuw: ${nieuw.length}`);

/* Schrijf de op te zoeken entries (nieuw + twijfel) weg voor lookup-list.mjs */
const todo = [...nieuw, ...maybe.map(([q]) => q)];
writeFileSync('scripts/list-todo.json', JSON.stringify(todo, null, 2) + '\n', 'utf8');
console.log(`Geschreven naar scripts/list-todo.json: ${todo.length} entries om op te zoeken.`);
