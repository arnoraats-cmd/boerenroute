/* ═══════════════════════════════════════════════════════════════
   icons.js — Hand-getekende categorie-iconen (SVG, huisstijl)

   Vervangt de losse emoji. Eén consistente penlijn-stijl, currentColor
   zodat we per context kleuren (groen in lijst, wit op kaart-pin).
   Het emoji-veld in de data blijft bestaan (stempelkaart-backupcodes);
   we leiden hier het icoon van de emoji af.
   ═══════════════════════════════════════════════════════════════ */

/* Binnenste SVG per icoon-sleutel. viewBox 0 0 24 24, stroke = currentColor.
   Bewust iets onregelmatige curves voor een hand-getekend gevoel. */
const PATHS = {
  // Kaaspunt (driehoekige wig) met gaatjes
  cheese: `<path d="M12 5.4c-.5 0-1 .27-1.27.73L4.4 17.3c-.55.96.14 2.16 1.25 2.16h12.7c1.1 0 1.8-1.2 1.25-2.16L13.27 6.13C13 5.67 12.5 5.4 12 5.4Z"/><circle cx="12" cy="13.6" r="1.15"/><circle cx="8.9" cy="16.9" r=".95"/><circle cx="15" cy="16.7" r=".95"/>`,
  // Melkfles met etiket-band
  milk: `<path d="M9.2 3.5h5.6"/><path d="M9.6 3.6c-.1 1.7-.2 2.8-1 3.7-.9 1-1.4 1.7-1.4 3.3V18c0 1.3.7 2 2 2h5.6c1.3 0 2-.7 2-2v-7.4c0-1.6-.5-2.3-1.4-3.3-.8-.9-.9-2-1-3.7"/><path d="M7.3 12.4h9.4"/>`,
  // Ei
  egg: `<path d="M12 3.6C8.7 3.6 6.2 8.4 6.3 12.3c.1 3.7 2.6 6.3 5.7 6.3s5.6-2.6 5.7-6.3C17.8 8.4 15.3 3.6 12 3.6Z"/>`,
  // Aardbei met kroontje en pitjes
  berry: `<path d="M12 8.2c3.4 0 5.6 1.7 5.6 4.2 0 2.8-2.9 6.8-5.6 8.3-2.7-1.5-5.6-5.5-5.6-8.3 0-2.5 2.2-4.2 5.6-4.2Z"/><path d="M12 8.2V5.6M9.3 6.2 12 8.2l2.8-2"/><path d="M9.9 12.4l.02 0M14 12.7l.02 0M11.8 15.4l.02 0M13.3 17.4l.02 0M10.4 17.2l.02 0" stroke-width="1.9"/>`,
  // Appel met blad
  apple: `<path d="M12 7.6c-1-1.1-2.6-1.5-4-.9C6 7.5 5.1 9.5 5.5 12c.4 2.5 1.9 5.4 3.7 6.4.9.5 1.7.1 2.8.1s1.9.4 2.8-.1c1.8-1 3.3-3.9 3.7-6.4.4-2.5-.5-4.5-2.5-5.3-1.4-.6-3-.2-4 .9Z"/><path d="M12 7.6V5.4c0-1 .9-1.9 2.2-1.8"/>`,
  // Wortel met loof
  carrot: `<path d="M8.7 9.7 11.9 19c.3.8 1 .8 1.3 0L16.1 9.6c-2.3-1-5.2-1-7.4.1Z"/><path d="M12.3 9.6 12 6.3M12 7.2c-1-1-2.5-1.2-3.7-.6M12.1 7.3c1-1.2 2.6-1.4 3.9-.7"/><path d="M10.3 12.7l1.6.6M14 12.3l-1.4.5M11.1 15.5l1.4.6" stroke-width="1.4"/>`,
  // Ham/gammon met botje
  meat: `<path d="M8.9 10.9c1.4-2.8 4.8-3.9 7.6-2.5 2.8 1.4 3.9 4.8 2.5 7.6-1.4 2.8-4.8 3.9-7.6 2.5-2.8-1.4-3.9-4.8-2.5-7.6Z"/><path d="M9.4 9.9 8 8.5"/><circle cx="6.95" cy="8.15" r="1.05"/><circle cx="8.15" cy="6.95" r="1.05"/><path d="M13.2 12.6c1 .5 1.7 1.5 1.8 2.7" stroke-width="1.3"/>`,
  // Graan-aar (default / streek)
  grain: `<path d="M12 21V7.5"/><path d="M12 7.8c.1-2 1.2-3.6 2.7-4.3M12 7.8c-.1-2-1.2-3.6-2.7-4.3"/><path d="M12 12.3c1.5-.2 2.8-1.4 3.2-3.2M12 12.3c-1.5-.2-2.8-1.4-3.2-3.2M12 16.4c1.5-.2 2.8-1.4 3.2-3.2M12 16.4c-1.5-.2-2.8-1.4-3.2-3.2"/>`,
  // Kiemplantje (zelfpluk / groen)
  sprout: `<path d="M12 20.5V12"/><path d="M12 13.2c-.6-3.1-3.1-4.4-5.8-4 .2 3 2.7 4.8 5.8 4Z"/><path d="M12 11.6c.5-2.7 3-3.9 5.4-3.3-.2 2.7-2.6 4.2-5.4 3.3Z"/>`,
  // Honingpot (squat) met deksel en honingdruppel
  honey: `<path d="M6.4 10.8h11.2v6.1c0 1.4-1.1 2.6-2.6 2.6H9c-1.4 0-2.6-1.1-2.6-2.6v-6.1Z"/><path d="M5.7 8.1c0-.66.54-1.2 1.2-1.2h10.2c.66 0 1.2.54 1.2 1.2v2.7H5.7V8.1Z"/><path d="M8.4 6.9V5.6c0-.55.45-1 1-1h5.2c.55 0 1 .45 1 1v1.3"/><path d="M12 13.3c-1.1 0-1.7.9-1.7 1.9 0 1 .76 1.7 1.7 1.7s1.7-.7 1.7-1.7c0-1-.6-1.9-1.7-1.9Z" stroke-width="1.35"/>`,
  // IJsje
  icecream: `<path d="M8 9.6c0-2.2 1.8-4 4-4s4 1.8 4 4c-1.2 1-2.6 1.6-4 1.6s-2.8-.6-4-1.6Z"/><path d="M8.3 9.9 12 20.3 15.7 9.9"/><path d="M9.6 14.6h4.8" stroke-width="1.4"/>`,
  // Markt-mand / winkel
  basket: `<path d="M5 9.2h14l-1.2 8.3c-.1 1-1 1.7-2 1.7H8.2c-1 0-1.9-.7-2-1.7L5 9.2Z"/><path d="M4 9.2h16"/><path d="M9 6.6 12 4l3 2.6"/><path d="M9.2 12.4v3.4M14.8 12.4v3.4M12 12.4v3.4" stroke-width="1.4"/>`,
  // Speeltuin-glijbaan (kids / onderweg)
  playground: `<path d="M5 19.3h14"/><path d="M8 19.3V8.2M6.2 8.2H8M6.2 11.4H8M6.2 14.6H8"/><path d="M8.2 8.4c4.6.2 6.4 5.4 9 10.6"/><circle cx="8" cy="5.4" r="1.4"/>`,
};

/* ── Groente/fruit-iconen voor de seizoenskalender ──────────────────
   Zelfde penlijn-stijl. Aangevuld op de winkel-iconen (berry, apple,
   carrot, sprout worden hergebruikt). */
const PRODUCE = {
  // Blad-groente (witlof, prei, spinazie, sla, kool, rucola …)
  leaf: `<path d="M5 19.4c-.6-7 4.4-13.6 14.2-14.6C16.2 12.4 9.7 19.4 5 19.4Z"/><path d="M6.6 17.9C9.9 13.6 13.3 11 17 9.4" stroke-width="1.3"/>`,
  // Knol/biet met blad (rode biet, knolselderij, aardpeer, radijs)
  beet: `<path d="M12 8.8c2.6 0 4.5 1.9 4.5 4.4 0 2.8-2.5 5.6-4.5 7.2-2-1.6-4.5-4.4-4.5-7.2 0-2.5 1.9-4.4 4.5-4.4Z"/><path d="M12 8.9c.2-2.1 1.7-3.5 3.8-3.6-.1 2.1-1.6 3.5-3.8 3.6Z"/><path d="M12 9c-.5-1.7-1.9-2.7-3.7-2.7" stroke-width="1.3"/>`,
  // Broccoli / bloemkool
  broccoli: `<path d="M12 19.6v-4.8M9.6 14.8h4.8"/><path d="M9.2 9.9a2.3 2.3 0 0 1 .7-3.2 2.3 2.3 0 0 1 3.7-1.1 2.3 2.3 0 0 1 3.4 1.3 2.2 2.2 0 0 1-.7 3.3 2.2 2.2 0 0 1-2 1.1 2.3 2.3 0 0 1-2.2 0 2.3 2.3 0 0 1-3-.7c-.6-.7-.4-1.7.4-2.9" stroke-linejoin="round"/>`,
  // Kersen
  cherry: `<circle cx="8.7" cy="16.4" r="2.7"/><circle cx="15.2" cy="16.9" r="2.5"/><path d="M9 13.9 12 6.8M15.4 14.5 12 6.8M12 6.8c1.5-.7 3.1-.5 4.4.6" stroke-width="1.3"/>`,
  // Peulvrucht (doperwten, bonen)
  pods: `<path d="M6.4 9.2c4.2-.4 9.7 2.2 11.4 8.4-6.2.8-11.5-2.6-11.4-8.4Z"/><circle cx="9.6" cy="12.6" r=".85"/><circle cx="12" cy="14.1" r=".85"/><circle cx="14.4" cy="15.4" r=".85"/>`,
  // Komkommer / courgette
  cucumber: `<path d="M7 17c-1.6-1.6-1.4-4.1.5-6l3.6-3.6c1.9-1.9 4.4-2.1 6-.5s1.4 4.1-.5 6l-3.6 3.6c-1.9 1.9-4.4 2.1-6 .5Z"/><path d="M10.2 13.8l1 1M12.6 11.4l1 1" stroke-width="1.2"/>`,
  // Tomaat (met kroontje)
  tomato: `<path d="M12 8c-3.3 0-6 2.5-6 5.8s2.7 5.7 6 5.7 6-2.4 6-5.7S15.3 8 12 8Z"/><path d="M12 8c-.8-1.3-2.1-1.8-3.6-1.4.3 1.5 1.5 2.4 3 2.4M12 8c.8-1.3 2.1-1.8 3.6-1.4-.3 1.5-1.5 2.4-3 2.4M12 7.3v1.4" stroke-width="1.3"/>`,
  // Paprika
  pepper: `<path d="M7.8 11c-1 2.6-.2 6.1 2.4 7.7 1.1.7 2.5.7 3.6 0 2.6-1.6 3.4-5.1 2.4-7.7-.7-1.8-2.4-2.5-4.2-2.5s-3.5.7-4.2 2.5Z"/><path d="M12 8.5V6.6M12 6.6c0-1.1.9-2 2.1-1.9" stroke-width="1.3"/>`,
  // Ui / knoflook
  onion: `<path d="M12 8.4c-3 0-5 2.6-5 6 0 3 2.2 5.1 5 5.1s5-2.1 5-5.1c0-3.4-2-6-5-6Z"/><path d="M12 8.4c-.4-1.5-.2-2.7.8-3.7M12 8.4c.4-1.5.2-2.7-.8-3.7" stroke-width="1.3"/><path d="M10 10.2c-.8 2-.8 5 .3 7.2M14 10.2c.8 2 .8 5-.3 7.2" stroke-width="1.1"/>`,
  // Maïs (kolf met blad)
  corn: `<path d="M12 4.8c2.6 0 4 2.4 4 6 0 4-2 8.6-4 8.6s-4-4.6-4-8.6c0-3.6 1.4-6 4-6Z"/><path d="M9.5 8.6c1.6 1 3.4 1 5 0M9.3 12c1.8 1 3.6 1 5.4 0M9.6 15.4c1.5.9 3.3.9 4.8 0" stroke-width="1.1"/><path d="M12 19.2c-1.9.4-3.3-.4-4.3-2.3M12 19.2c1.9.4 3.3-.4 4.3-2.3" stroke-width="1.2"/>`,
  // Peer
  pear: `<path d="M12 7.6c1.5 0 2.1 1.3 2.5 2.6.5 1.6 2.3 2.6 2.3 5.1 0 2.5-2.1 4.4-4.8 4.4s-4.8-1.9-4.8-4.4c0-2.5 1.8-3.5 2.3-5.1.4-1.3 1-2.6 2.5-2.6Z"/><path d="M12 7.6V5.6c0-1 .9-1.8 2-1.7" stroke-width="1.3"/>`,
  // Pruim (met groef)
  plum: `<path d="M12 8.2c-3 0-5 2.4-5 5.6s2 5.9 5 5.9 5-2.7 5-5.9-2-5.6-5-5.6Z"/><path d="M12 8.7v10.6" stroke-width="1.1"/><path d="M12 8.2c.3-1.6 1.6-2.7 3.4-2.7" stroke-width="1.3"/>`,
  // Pompoen (geribd)
  pumpkin: `<path d="M12 8.6c-3.2 0-5.6 2.4-5.6 5.6s2.4 5.5 5.6 5.5 5.6-2.3 5.6-5.5S15.2 8.6 12 8.6Z"/><path d="M12 9v10.6M9.1 9.6c-1.1 1.4-1.1 8.2 0 9.6M14.9 9.6c1.1 1.4 1.1 8.2 0 9.6" stroke-width="1.1"/><path d="M12 8.6V6.5c0-.8.7-1.4 1.6-1.3" stroke-width="1.3"/>`,
};

/* Productnaam → icoon-sleutel (sleutel uit PATHS of PRODUCE).
   Niet-gemapte producten vallen terug op de emoji in season.js. */
const PRODUCT = {
  // soft fruit
  'aardbeien':'berry','frambozen':'berry','bramen':'berry','bosbessen':'berry','kersen':'cherry',
  // hard fruit
  'appelen':'apple','appelen (bewaard)':'apple','peren':'pear','pruimen':'plum',
  // vrucht-groente
  'tomaten':'tomato','paprika':'pepper','komkommer':'cucumber','courgette':'cucumber',
  'pompoen':'pumpkin','maïs':'corn','courgette ':'cucumber',
  // wortel/knol
  'winterpeen':'carrot','pastinaak':'carrot','rode biet':'beet','knolselderij':'beet',
  'aardpeer':'beet','radijs':'beet','koolrabi':'beet',
  // bol
  'uien':'onion','knoflook':'onion',
  // kool/bloemscherm
  'broccoli':'broccoli','bloemkool':'broccoli',
  // peul
  'doperwten':'pods','bonen':'pods',
  // stengel
  'asperges':'sprout','rabarber':'leaf','venkel':'leaf',
  // blad
  'witlof':'leaf','prei':'leaf','spruitjes':'leaf','boerenkool':'leaf','rode kool':'leaf',
  'spinazie':'leaf','veldsla':'leaf','rucola':'leaf','raapstelen':'leaf','sla':'leaf','postelein':'leaf',
};

/* Emoji → icoon-sleutel */
const EMOJI = {
  '🧀': 'cheese', '🧈': 'cheese',
  '🥛': 'milk', '🐄': 'milk', '🐐': 'milk', '🐑': 'milk',
  '🥚': 'egg', '🍗': 'egg',
  '🍓': 'berry', '🍒': 'berry', '🫐': 'berry',
  '🍎': 'apple',
  '🥕': 'carrot', '🥬': 'carrot', '🥔': 'carrot', '🍄': 'carrot',
  '🥩': 'meat', '🐗': 'meat',
  '🌾': 'grain',
  '🌱': 'sprout', '🌿': 'sprout', '🌷': 'sprout', '🌸': 'sprout',
  '🍯': 'honey',
  '🍦': 'icecream',
  '🛒': 'basket', '🪙': 'basket',
  '🛝': 'playground',
};

/* Bepaal icoon-sleutel: eerst via emoji, anders via tags/type */
function keyFor(shop) {
  if (shop && shop.emoji && EMOJI[shop.emoji]) return EMOJI[shop.emoji];
  const tags = (shop && shop.tags) || [];
  if (tags.includes('kindvriendelijk')) return 'playground';
  if (tags.includes('zuivel')) return 'cheese';
  if (tags.includes('eieren')) return 'egg';
  if (tags.includes('fruit')) return 'berry';
  if (tags.includes('groente')) return 'carrot';
  if (tags.includes('vlees')) return 'meat';
  if (tags.includes('honing')) return 'honey';
  if (shop && shop.type === 'automaat') return 'basket';
  if (shop && shop.type === 'markt') return 'basket';
  if (shop && shop.type === 'onderweg') return 'playground';
  return 'grain';
}

/* Geef inline <svg>-string voor een winkel(-achtig object met .emoji/.tags) */
export function shopIcon(shop, { size = 22, stroke = 'currentColor', sw = 1.7, cls = 'hd-icon' } = {}) {
  const key = keyFor(shop);
  const inner = PATHS[key] || PATHS.grain;
  return `<svg class="${cls}" data-icon="${key}" width="${size}" height="${size}" viewBox="0 0 24 24" `
    + `fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" `
    + `aria-hidden="true" focusable="false">${inner}</svg>`;
}

/* Render een icoon op basis van een los emoji-teken (bv. opgeslagen stempel) */
export function emojiIcon(emoji, opts) {
  return shopIcon({ emoji }, opts);
}

/* Sleutel voor een productnaam, of null als er geen eigen icoon is */
export function productKey(name) {
  return PRODUCT[String(name || '').toLowerCase().trim()] || null;
}

/* Eigen icoon voor een seizoensproduct; geeft null terug als er geen is
   (dan valt season.js terug op de emoji). */
export function productIcon(name, { size = 30, stroke = 'currentColor', sw = 1.6, cls = 'hd-icon' } = {}) {
  const key = productKey(name);
  if (!key) return null;
  const inner = PRODUCE[key] || PATHS[key];
  if (!inner) return null;
  return `<svg class="${cls}" data-icon="${key}" width="${size}" height="${size}" viewBox="0 0 24 24" `
    + `fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" `
    + `aria-hidden="true" focusable="false">${inner}</svg>`;
}

export { keyFor as iconKey };
