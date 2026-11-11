// Servidor estático de dist/ con las mismas cabeceras (CSP incluida) que Netlify.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

export const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
  '.xml': 'application/xml', '.txt': 'text/plain',
};

export function startServer(port = 0) {
  const block = fs.readFileSync(path.join(DIST, '_headers'), 'utf8').split(/\n\n/)[0];
  const headers = Object.fromEntries(block.split('\n').slice(1).map((l) => l.trim().split(/:\s(.+)/).slice(0, 2)));
  delete headers['Strict-Transport-Security'];
  headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace('; upgrade-insecure-requests', '');

  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    let file = path.join(DIST, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
    let status = 200;
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(DIST, '404.html');
      status = 404;
    }
    res.writeHead(status, { ...headers, 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

export const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
