/* ═══════════════════════════════════════════════════════════════
   triage-candidates.mjs — splitst new-candidates.json in tiers.

   - Alleen Nederland (Nederlandse postcode 1234 AB in adres).
   - STERK : ondubbelzinnig verkooppunt (automaat/boerderijwinkel/
             landwinkel/zelfpluk/melktap/eierhok…).
   - MIDDEL: boerderij/hoeve/kaas-/zuivelboerderij/streek… (review).
   Schrijft scripts/candidates-strong.json en candidates-mid.json.
   Voegt NIETS aan de database toe.
   ═══════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync } from 'fs';

const c = JSON.parse(readFileSync('scripts/new-candidates.json', 'utf8'));

const NL     = /\b\d{4}\s?[A-Z]{2}\b/;
const isNL   = x => NL.test(x.address || '') || /Nederland/.test(x.address || '');
const STRONG = /automaat|boerderijwinkel|hoevewinkel|landwinkel|boerenwinkel|zelfpluk|pluktuin|melktap|eierhok|eierhuis|eierautomaat/i;
const MID    = /boerderij|hoeve|kaasboerderij|zuivelboerderij|streekproduct|imker|honingboerderij|ijsboerderij|geitenboerderij/i;

const nl     = c.filter(isNL);
const strong = nl.filter(x => STRONG.test(x.name || ''));
const mid    = nl.filter(x => !STRONG.test(x.name || '') && MID.test(x.name || ''));

writeFileSync('scripts/candidates-strong.json', JSON.stringify(strong, null, 2) + '\n');
writeFileSync('scripts/candidates-mid.json',    JSON.stringify(mid,    null, 2) + '\n');

console.log(`NL: ${nl.length} / ${c.length}  ·  STERK: ${strong.length}  ·  MIDDEL: ${mid.length}`);
console.log('→ scripts/candidates-strong.json, scripts/candidates-mid.json');
