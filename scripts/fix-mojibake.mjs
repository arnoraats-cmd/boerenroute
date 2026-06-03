/* ═══════════════════════════════════════════════════════════════
   fix-mojibake.mjs — herstelt dubbel-gecodeerde tekst (mojibake)

   Tekst die ooit als Windows-1252 is gelezen en weer als UTF-8 is
   weggeschreven, toont dingen als "â€"" (–), "Â·" (·), "dÃ©" (dé).
   Dit script draait dat terug, alléén voor velden die zo'n signatuur
   bevatten (schone velden blijven ongemoeid).

   Dry-run standaard; --write om op te slaan.
     node scripts/fix-mojibake.mjs
     node scripts/fix-mojibake.mjs --write
   ═══════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync } from 'fs';

/* Windows-1252 afwijkingen t.o.v. latin1 (0x80–0x9F) — Unicode → byte */
const CP1252 = {
  0x20AC:0x80,0x201A:0x82,0x0192:0x83,0x201E:0x84,0x2026:0x85,0x2020:0x86,
  0x2021:0x87,0x02C6:0x88,0x2030:0x89,0x0160:0x8A,0x2039:0x8B,0x0152:0x8C,
  0x017D:0x8E,0x2018:0x91,0x2019:0x92,0x201C:0x93,0x201D:0x94,0x2022:0x95,
  0x2013:0x96,0x2014:0x97,0x02DC:0x98,0x2122:0x99,0x0161:0x9A,0x203A:0x9B,
  0x0153:0x9C,0x017E:0x9E,0x0178:0x9F,
};

const SIG = /â€|Ã.|Â.|Å| Â/; // mojibake-signatuur

function demojibake(s) {
  const bytes = [];
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (CP1252[c] !== undefined)      bytes.push(CP1252[c]);
    else if (c <= 0xFF)               bytes.push(c);
    else                              return s; // niet-decodeerbaar → ongemoeid laten
  }
  try {
    const out = Buffer.from(bytes).toString('utf8');
    return out.includes('�') ? s : out; // ongeldige UTF-8 → ongemoeid
  } catch { return s; }
}

function fixField(v) {
  if (typeof v === 'string') return SIG.test(v) ? demojibake(v) : v;
  if (Array.isArray(v))      return v.map(fixField);
  return v;
}

const WRITE = process.argv.includes('--write');
const FILE  = 'src/data/verifiedShops.json';
const shops = JSON.parse(readFileSync(FILE, 'utf8'));
const FIELDS = ['name', 'address', 'hours', 'desc', 'products', 'dagVers'];

let changed = 0;
for (const shop of shops) {
  for (const f of FIELDS) {
    if (shop[f] == null) continue;
    const fixed = fixField(shop[f]);
    if (JSON.stringify(fixed) !== JSON.stringify(shop[f])) {
      console.log(`#${shop.id} ${f}:`);
      console.log(`   - ${JSON.stringify(shop[f])}`);
      console.log(`   + ${JSON.stringify(fixed)}`);
      shop[f] = fixed;
      changed++;
    }
  }
}

console.log(`\nVelden hersteld: ${changed}.`);
if (WRITE && changed) {
  writeFileSync(FILE, JSON.stringify(shops, null, 2) + '\n', 'utf8');
  console.log(`Opgeslagen in ${FILE}.`);
} else if (!WRITE) {
  console.log('Dry-run — niets gewijzigd. Voeg --write toe om op te slaan.');
}
