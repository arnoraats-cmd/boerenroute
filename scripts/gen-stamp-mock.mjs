import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { emojiIcon } from '../src/icons.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const samples = [
  ['🧀',"Siebe's Kaas"],['🥚','Eierautomaat De Hoeve'],['🍓','Zelfpluk Aardbeienland'],
  ['🥕','Groentetuin Bert'],['🍯','Imkerij De Lindehof'],['🥩','Boerderijslager'],
  ['🥛','Melktap Hofs'],['🍎','Fruitboerderij'],
];
const rots = [-4,3,-2,5,-3,2,-5,4];

const stamps = samples.map(([e,n],i)=>`<div class="sk-stamp sk-stamp-filled" style="--rot:${rots[i]}deg"><span class="sk-stamp-emoji">${emojiIcon(e,{size:24,sw:1.8})}</span><span class="sk-stamp-name">${n.split(' ')[0]}</span></div>`).join('')
  + Array.from({length:4}).map(()=>`<div class="sk-stamp sk-stamp-empty"><span class="sk-stamp-dot"></span></div>`).join('');

const recent = samples.slice(0,3).map(([e,n])=>`<li class="sk-recent-item"><span class="sk-recent-emoji">${emojiIcon(e,{size:22})}</span><div class="sk-recent-info"><div class="sk-recent-name">${n}</div><div class="sk-recent-addr">Dorpsstraat 1, Uden</div></div><span class="sk-recent-age">2 dagen</span></li>`).join('');

const html=`<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Lora:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles/main.css">
<style>body{background:#F8F4EC;padding:24px;font-family:'DM Sans',sans-serif}
h2{font-family:'Lora',serif;color:#1C4109}.wrap{max-width:560px}*{animation:none!important}</style>
</head><body><div class="wrap">
<h2>Stempelgrid</h2><div class="sk-stamp-grid">${stamps}</div>
<h2>Recent bezocht</h2><ul class="sk-recent">${recent}</ul>
</div></body></html>`;
writeFileSync(join(root,'stamp-mock.html'),html,'utf8');
console.log('✓ stamp-mock.html');
