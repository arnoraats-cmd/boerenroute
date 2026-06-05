/* Genereert public/sitemap.xml uit de aanwezige blog- en regiopagina's.
   Toekomstbestendig: nieuwe pagina's worden automatisch meegenomen. */
import { readdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.boerenroute.nl';
const today = new Date().toISOString().slice(0, 10);

const urls = [];
const add = (loc, priority, changefreq) =>
  urls.push({ loc, priority, changefreq, lastmod: today });

// Kern
add(`${SITE}/`, '1.0', 'weekly');
add(`${SITE}/blog/`, '0.8', 'weekly');
add(`${SITE}/aanmelden`, '0.7', 'monthly');

// Categoriepagina's
for (const slug of ['versautomaten','eierautomaten','zelfpluktuinen','melktap','streekproducten']) {
  add(`${SITE}/${slug}`, '0.8', 'monthly');
}

// Blogartikelen
const blogDir = join(root, 'public/blog');
if (existsSync(blogDir)) {
  for (const f of readdirSync(blogDir)) {
    if (!f.endsWith('.html') || f === 'index.html') continue;
    add(`${SITE}/blog/${f.replace(/\.html$/, '')}`, '0.7', 'monthly');
  }
}

// Regiopagina's
const regioDir = join(root, 'public/regio');
if (existsSync(regioDir)) {
  for (const f of readdirSync(regioDir)) {
    if (!f.endsWith('.html')) continue;
    add(`${SITE}/regio/${f.replace(/\.html$/, '')}`, '0.8', 'monthly');
  }
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

writeFileSync(join(root, 'public/sitemap.xml'), xml, 'utf8');
console.log(`✓ sitemap.xml — ${urls.length} URLs (lastmod ${today})`);
