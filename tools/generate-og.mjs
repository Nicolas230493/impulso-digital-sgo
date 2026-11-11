// Genera:
//   src/images/og-preview.jpg                 (1200×630, vista previa para redes)
//   src/images/proyectos/sitio-corporativo.webp (captura del sitio para el portfolio)
// Requiere un build previo (usa dist/) y Google Chrome instalado (CHROME_PATH para otra ruta).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { startServer, CHROME, DIST } from './server.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readdirSync(path.join(DIST, 'assets')).find((f) => f.endsWith('.css'));
const logo = fs.readFileSync(path.join(ROOT, 'src/images/logo.svg'), 'utf8');

const ogHtml = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="/assets/${css}">
<style>
  body{margin:0}
  .og{position:relative;width:1200px;height:630px;overflow:hidden;background:#05070F;display:flex;align-items:center;padding:0 96px;box-sizing:border-box;font-family:'Plus Jakarta Sans Variable',sans-serif}
  .grid{position:absolute;inset:0;opacity:.18;background-image:linear-gradient(to right,#1e293b 1px,transparent 1px),linear-gradient(to bottom,#1e293b 1px,transparent 1px);background-size:64px 64px}
  .blob{position:absolute;border-radius:50%;filter:blur(140px)}
  .b1{top:-160px;right:-80px;width:700px;height:700px;background:rgba(22,78,99,.45)}
  .b2{bottom:-200px;left:60px;width:520px;height:520px;background:rgba(30,58,138,.4)}
  .row{position:relative;display:flex;align-items:center;gap:64px;width:100%}
  .logo{width:260px;height:260px;flex-shrink:0}.logo svg{width:100%;height:100%}
  .t1{display:block;font-size:68px;font-weight:900;letter-spacing:.2em;color:#fff;line-height:1}
  .t2{display:block;margin-top:14px;font-size:26px;font-weight:700;letter-spacing:.45em;color:#06B6D4}
  .bar{margin:30px 0;height:6px;width:96px;border-radius:9px;background:linear-gradient(to right,#06B6D4,#2563EB)}
  .p1{margin:0;font-size:34px;font-weight:700;color:#E2E8F0;line-height:1.3}
  .p2{margin:22px 0 0;font-size:22px;color:#94A3B8}
</style></head>
<body><div class="og">
  <div class="grid"></div><div class="blob b1"></div><div class="blob b2"></div>
  <div class="row">
    <div class="logo">${logo}</div>
    <div>
      <span class="t1">IMPULSO</span><span class="t2">DIGITAL SGO</span>
      <div class="bar"></div>
      <p class="p1">Software · Análisis de datos<br>Ciberseguridad</p>
      <p class="p2">Soluciones tecnológicas para empresas y comercios</p>
    </div>
  </div>
</div></body></html>`;
fs.writeFileSync(path.join(DIST, '_og.html'), ogHtml);

const { server, url } = await startServer();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setBypassCSP(true); // la plantilla OG usa estilos propios (no se publica)

  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.goto(`${url}/_og.html`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  const og = await page.screenshot({ type: 'png' });
  await sharp(og).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(ROOT, 'src/images/og-preview.jpg'));
  console.log('✔ src/images/og-preview.jpg');

  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.goto(`${url}/`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  const shot = await page.screenshot({ type: 'png' });
  await sharp(shot).webp({ quality: 80 }).toFile(path.join(ROOT, 'src/images/proyectos/sitio-corporativo.webp'));
  console.log('✔ src/images/proyectos/sitio-corporativo.webp');
} finally {
  await browser.close();
  server.close();
  fs.rmSync(path.join(DIST, '_og.html'), { force: true });
}
console.log('Ejecutá `npm run build` para incluirlos en dist/.');
