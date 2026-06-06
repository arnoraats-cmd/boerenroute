/* Mini static server voor lokale preview (ES-modules werken niet via file://) */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
  '.json':'application/json', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/icon-preview.html';
  const file = path.join(root, p);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(5179, () => console.log('Preview: http://localhost:5179/icon-preview.html'));
