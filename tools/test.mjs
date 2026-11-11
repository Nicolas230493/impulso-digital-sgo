// Pruebas finales (Fase 6) sobre dist/ servido con las mismas cabeceras que Netlify (CSP incluida).
//   npm test
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';
import { startServer, CHROME, DIST } from './server.mjs';

const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const cfg = JSON.parse(fs.readFileSync(path.join(DIST, '..', 'site.config.json'), 'utf8'));

let passed = 0;
const failures = [];
async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✔ ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`  ✖ ${name}\n      ${e.message.split('\n').join('\n      ')}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { server, url } = await startServer();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });

/** Abre una página registrando errores de consola, violaciones CSP y recursos fallidos. */
async function open(pathname, viewport = { width: 1280, height: 800 }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`consola: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`JS: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`falló: ${r.url()} (${r.failure()?.errorText})`));
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().endsWith(pathname)) problems.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  await page.evaluateOnNewDocument(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ← ${e.blockedURI}`));
    window.__opened = [];
    window.open = (u) => { window.__opened.push(u); return null; };
  });
  const res = await page.goto(url + pathname, { waitUntil: 'networkidle0' });
  page.problems = async () => [...problems, ...(await page.evaluate(() => window.__csp)).map((v) => `CSP: ${v}`)];
  page.status = res.status();
  return page;
}

async function scrollAll(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForNetworkIdle({ idleTime: 300 });
}

async function runAxe(page) {
  await page.setBypassCSP(true);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.addScriptTag({ content: AXE });
  const r = await page.evaluate(async () => {
    const res = await window.axe.run(document, { resultTypes: ['violations'] });
    return res.violations.map((v) => `[${v.impact}] ${v.id}: ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  });
  return r;
}

console.log('\nNavegación desktop');
const home = await open('/');

await test('Carga sin errores de consola, CSP ni recursos rotos', async () => {
  await scrollAll(home);
  const p = await home.problems();
  assert(!p.length, p.join('\n'));
});

await test('Todas las imágenes cargan (ninguna rota)', async () => {
  await home.$$eval('img[loading=lazy]', (imgs) => imgs.forEach((i) => (i.loading = 'eager')));
  await home.waitForNetworkIdle({ idleTime: 300 });
  const broken = await home.$$eval('img', (imgs) => imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));
  assert(!broken.length, 'Rotas: ' + broken.join(', '));
});

await test('Enlaces internos (#ancla) apuntan a secciones existentes', async () => {
  const bad = await home.$$eval('a[href^="#"]', (as) => as.map((a) => a.getAttribute('href')).filter((h) => h === '#' || !document.querySelector(h)));
  assert(!bad.length, bad.join(', '));
});

await test('Sin enlaces ficticios ni marcadores', async () => {
  const html = await home.content();
  assert(!/URL_DE_TU_PAGINA|placehold\.co|cdn\.tailwindcss|TU-DOMINIO|\{\{/.test(html), 'Quedan marcadores');
});

await test('Solo se cargan recursos propios (sin CDNs externos)', async () => {
  const ext = await home.evaluate((origin) => performance.getEntriesByType('resource').map((e) => e.name).filter((n) => !n.startsWith(origin)), url)
    .then((list) => list.filter((n) => !(cfg.gaMeasurementId && /google-analytics\.com|googletagmanager\.com/.test(n))));
  assert(!ext.length, ext.join('\n'));
});

console.log('\nSEO');
await test('Title, description, Open Graph y Twitter Card presentes', async () => {
  const meta = await home.evaluate(() => ({
    title: document.title,
    desc: document.querySelector('meta[name=description]')?.content,
    robots: document.querySelector('meta[name=robots]')?.content,
    ogTitle: document.querySelector('meta[property="og:title"]')?.content,
    ogDesc: document.querySelector('meta[property="og:description"]')?.content,
    twitter: document.querySelector('meta[name="twitter:card"]')?.content,
    favicon: document.querySelector('link[rel=icon]')?.href,
    lang: document.documentElement.lang,
  }));
  for (const [k, v] of Object.entries(meta)) assert(v, `Falta ${k}`);
  assert(meta.title.length <= 65, `Title largo (${meta.title.length})`);
  assert(meta.desc.length >= 70 && meta.desc.length <= 170, `Description de ${meta.desc.length} caracteres`);
});

await test('Datos estructurados Schema.org válidos (JSON)', async () => {
  const ld = await home.$eval('script[type="application/ld+json"]', (s) => JSON.parse(s.textContent));
  const types = ld['@graph'].map((n) => n['@type']);
  assert(types.includes('Organization') && types.includes('SoftwareApplication'), types.join(','));
});

await test('Un único H1 y jerarquía de títulos sin saltos', async () => {
  const levels = await home.$$eval('main h1, main h2, main h3, main h4, main h5, main h6', (hs) => hs.map((h) => +h.tagName[1]));
  assert(levels.filter((l) => l === 1).length === 1, 'Debe haber exactamente un H1');
  for (let i = 1; i < levels.length; i++) assert(levels[i] - levels[i - 1] <= 1, `Salto de H${levels[i - 1]} a H${levels[i]}`);
});

await test('robots.txt presente' + (cfg.siteUrl ? ' y sitemap.xml' : ''), async () => {
  assert(fs.existsSync(path.join(DIST, 'robots.txt')), 'falta robots.txt');
  if (cfg.siteUrl) assert(fs.existsSync(path.join(DIST, 'sitemap.xml')), 'falta sitemap.xml');
});

console.log('\nContenido corporativo');
await test('Tres servicios del spec presentes', async () => {
  const h3 = await home.$$eval('#servicios h3', (hs) => hs.map((h) => h.textContent.trim()));
  for (const s of ['Desarrollo de software', 'Análisis de datos', 'Ciberseguridad']) assert(h3.includes(s), `Falta ${s}`);
});
await test('Impulso Smart destacado (web + prueba 30 días)', async () => {
  const t = await home.$eval('#impulso-smart', (s) => s.textContent);
  assert(/Impulso Smart/.test(t) && /Versión web/i.test(t) && /30 días/.test(t), 'Incompleto');
});
await test('Misión, visión y propuesta de valor', async () => {
  const t = await home.$eval('#nosotros', (s) => s.textContent);
  for (const s of ['Misión', 'Visión', 'Propuesta de valor']) assert(t.includes(s), `Falta ${s}`);
});

console.log('\nPortfolio');
await test('Filtros por categoría (Software, Datos, Web, Ciberseguridad) y estado vacío', async () => {
  const visible = () => home.$$eval('#proyectos-grid .filterable', (els) => els.filter((e) => getComputedStyle(e).display !== 'none').length);
  const total = await visible();
  for (const cat of ['software', 'datos', 'web', 'ciberseguridad']) {
    await home.click(`.filter-btn[data-target=proyectos][data-filter=${cat}]`);
    const expected = await home.$$eval(`#proyectos-grid .filterable[data-category=${cat}]`, (e) => e.length);
    assert((await visible()) === expected, `Filtro ${cat}`);
    const emptyShown = await home.$eval('#proyectos-empty', (e) => !e.classList.contains('hidden'));
    assert(emptyShown === (expected === 0), `Estado vacío incorrecto en ${cat}`);
    assert((await home.$eval(`.filter-btn[data-filter=${cat}][data-target=proyectos]`, (b) => b.getAttribute('aria-pressed'))) === 'true', 'aria-pressed');
  }
  await home.click('.filter-btn[data-target=proyectos][data-filter=all]');
  assert((await visible()) === total, 'Filtro Todos');
});

console.log('\nLightbox');
await test('Abre como diálogo, foco en Cerrar, Tab atrapado, Escape cierra y devuelve el foco', async () => {
  const trigger = await home.$('[data-lightbox]');
  assert(trigger, 'No hay elementos con lightbox');
  await trigger.focus();
  await home.keyboard.press('Enter');
  await sleep(100);
  const st = await home.evaluate(() => {
    const d = document.getElementById('lightbox');
    return { open: !d.classList.contains('hidden'), role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), focus: document.activeElement.id, title: document.getElementById('lightbox-title').textContent, img: !!d.querySelector('img'), overflow: document.body.classList.contains('overflow-hidden') };
  });
  assert(st.open && st.role === 'dialog' && st.modal === 'true', 'No abre como diálogo modal');
  assert(st.focus === 'lightbox-close', `Foco en ${st.focus}`);
  assert(st.title && st.img && st.overflow, 'Contenido/título/bloqueo de scroll');
  await home.keyboard.press('Tab');
  await home.keyboard.press('Tab');
  assert((await home.evaluate(() => document.getElementById('lightbox').contains(document.activeElement))), 'El foco escapó del diálogo');
  await home.keyboard.press('Escape');
  await sleep(50);
  const after = await home.evaluate(() => ({ closed: document.getElementById('lightbox').classList.contains('hidden'), back: document.activeElement.hasAttribute('data-lightbox') }));
  assert(after.closed, 'Escape no cierra');
  assert(after.back, 'El foco no volvió al disparador');
});
await test('Clic fuera del contenido cierra el lightbox', async () => {
  await home.click('[data-lightbox]');
  await sleep(100);
  await home.mouse.click(5, 5);
  await sleep(50);
  assert(await home.$eval('#lightbox', (d) => d.classList.contains('hidden')), 'No cierra');
});

console.log('\nFormulario');
await test('Validación: campos obligatorios, mensajes y foco en el primer error', async () => {
  await home.$eval('#contact-form', (f) => f.reset());
  await home.click('#form-submit');
  const r = await home.evaluate(() => ({
    invalid: [...document.querySelectorAll('#contact-form [aria-invalid=true]')].map((e) => e.name),
    focus: document.activeElement.id,
    msg: document.getElementById('form-name-error').textContent,
  }));
  for (const n of ['nombre', 'email', 'servicio', 'mensaje', 'consentimiento']) assert(r.invalid.includes(n), `Sin error en ${n}`);
  assert(r.focus === 'form-name', `Foco en ${r.focus}`);
  assert(r.msg, 'Sin mensaje de error');
});
await test('Validación de correo electrónico', async () => {
  await home.type('#form-email', 'correo-invalido@');
  await home.click('#form-submit');
  assert((await home.$eval('#form-email', (e) => e.getAttribute('aria-invalid'))) === 'true', 'Acepta correo inválido');
  await home.$eval('#form-email', (e) => (e.value = ''));
});

async function fillValid() {
  await home.$eval('#contact-form', (f) => f.reset());
  await home.type('#form-name', 'Prueba Automática');
  await home.type('#form-company', 'Comercio Test');
  await home.type('#form-email', 'prueba@ejemplo.com');
  await home.type('#form-phone', '+54 385 400 0000');
  await home.select('#form-service', 'Ciberseguridad');
  await home.type('#form-message', 'Mensaje de prueba automatizada del formulario.');
  await home.click('#form-consent');
}

await test('Sin Formspree configurado: deriva a WhatsApp sin perder la consulta', async () => {
  if (cfg.formspreeId) return;
  await fillValid();
  await sleep(3100);
  await home.click('#form-submit');
  await sleep(100);
  const r = await home.$eval('#form-status', (s) => ({ visible: !s.classList.contains('hidden'), href: s.querySelector('a')?.href || '' }));
  assert(r.visible && r.href.startsWith(`https://wa.me/${cfg.whatsapp}?text=`), 'No ofrece WhatsApp');
  assert(decodeURIComponent(r.href).includes('Prueba Automática'), 'El mensaje no incluye los datos');
});

async function withEndpoint(status, body) {
  await home.setRequestInterception(true);
  const handler = (req) => {
    if (req.url().startsWith('https://formspree.io/')) {
      home.lastPost = req.postData() || '';
      req.respond({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
    } else req.continue();
  };
  home.on('request', handler);
  await home.$eval('#contact-form', (f) => (f.dataset.endpoint = 'https://formspree.io/f/test1234'));
  await fillValid();
  await sleep(3100);
  await home.click('#form-submit');
  await sleep(400);
  home.off('request', handler);
  await home.setRequestInterception(false);
}

await test('Con Formspree: envía los datos reales y confirma la recepción', async () => {
  await withEndpoint(200, { ok: true });
  for (const f of ['nombre', 'empresa', 'email', 'telefono', 'servicio', 'mensaje']) assert(home.lastPost.includes(`name="${f}"`), `No envía ${f}`);
  const ok = await home.$eval('#form-success', (s) => !s.classList.contains('hidden'));
  assert(ok, 'No muestra confirmación');
  const lead = await home.evaluate(() => window.dataLayer.some((e) => e.event === 'generate_lead'));
  assert(lead, 'No registra la conversión generate_lead');
  await home.click('#form-reset');
});
await test('Con Formspree: maneja errores del servicio y ofrece alternativa', async () => {
  await withEndpoint(422, { errors: [{ message: 'Error simulado' }] });
  const r = await home.$eval('#form-status', (s) => ({ visible: !s.classList.contains('hidden'), text: s.textContent, href: s.querySelector('a')?.href || '' }));
  assert(r.visible && /No pudimos enviar/.test(r.text) && r.href.includes('wa.me'), 'Sin manejo de error');
  assert(!(await home.$eval('#form-success', (s) => !s.classList.contains('hidden'))), 'Muestra éxito ante un error');
});
await test('Anti-spam: campo trampa bloquea el envío', async () => {
  await home.$eval('#contact-form', (f) => f.reset());
  await fillValid();
  await home.$eval('#form-website', (e) => (e.value = 'http://spam.example'));
  let posted = false;
  await home.setRequestInterception(true);
  const h = (req) => { if (req.url().includes('formspree')) posted = true; req.continue(); };
  home.on('request', h);
  await home.click('#form-submit');
  await sleep(200);
  home.off('request', h);
  await home.setRequestInterception(false);
  assert(!posted, 'Envió con el campo trampa completo');
  await home.$eval('#contact-form', (f) => f.reset());
});
await test('Protección XSS: el contenido del formulario no se interpreta como HTML', async () => {
  await home.$eval('#contact-form', (f) => (f.dataset.endpoint = ''));
  await fillValid();
  await home.$eval('#form-name', (e) => (e.value = '<img src=x onerror="window.__xss=1">'));
  await sleep(3100);
  await home.click('#form-submit');
  await sleep(200);
  assert(!(await home.evaluate(() => window.__xss)), 'Se ejecutó código inyectado');
  assert(!(await home.$('#form-status img')), 'Se insertó HTML');
});

console.log('\nWhatsApp');
await test('Todos los enlaces de WhatsApp apuntan al número con mensaje personalizado', async () => {
  const links = await home.$$eval('a[href*="wa.me"]', (as) => as.map((a) => ({ href: a.href, tag: a.dataset.wa })));
  assert(links.length >= 5, `Solo ${links.length} enlaces`);
  for (const l of links) {
    assert(l.href.startsWith(`https://wa.me/${cfg.whatsapp}?text=`), `Número incorrecto: ${l.href}`);
    assert(decodeURIComponent(l.href.split('text=')[1]).length > 10, 'Mensaje vacío');
  }
  const msgs = new Set(links.map((l) => l.href));
  assert(msgs.size >= 5, 'Los mensajes no se diferencian por servicio');
});
await test('Botón "Enviar por WhatsApp" del formulario arma el mensaje y registra la conversión', async () => {
  await fillValid();
  await home.click('#form-whatsapp');
  const r = await home.evaluate(() => ({ u: window.__opened.at(-1), t: window.dataLayer.some((e) => e.event === 'whatsapp_click') }));
  assert(r.u?.startsWith(`https://wa.me/${cfg.whatsapp}?text=`) && decodeURIComponent(r.u).includes('Ciberseguridad'), 'URL incorrecta');
  assert(r.t, 'Sin evento de seguimiento');
});
await test('"Consultar" de un servicio preselecciona el servicio en el formulario', async () => {
  await home.$eval('#contact-form', (f) => f.reset());
  await home.click('#servicios a[data-service="Análisis de datos"]');
  await sleep(100);
  assert((await home.$eval('#form-service', (s) => s.value)) === 'Análisis de datos', 'No preselecciona');
});
await test('Email visible como enlace mailto', async () => {
  const href = await home.$eval('[data-email-user]', (a) => a.href);
  assert(href === `mailto:${cfg.email}`, href);
});

console.log('\nAccesibilidad (axe-core, WCAG 2.1 AA)');
await test('Página principal sin violaciones de accesibilidad', async () => {
  const p = await open('/');
  const v = await runAxe(p);
  assert(!v.length, v.join('\n'));
  await p.close();
});
await test('El primer Tab enfoca "Saltar al contenido"', async () => {
  const p = await open('/');
  await p.keyboard.press('Tab');
  assert((await p.evaluate(() => document.activeElement.getAttribute('href'))) === '#contenido', 'No');
  await p.close();
});

console.log('\nNavegación móvil (375×812)');
const mob = await open('/', { width: 375, height: 812, isMobile: true, hasTouch: true });
await test('Sin desplazamiento horizontal', async () => {
  await scrollAll(mob);
  const r = await mob.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  assert(r.sw <= r.w, `scrollWidth ${r.sw} > ${r.w}`);
});
await test('Menú móvil: abre, actualiza aria-expanded, cierra al elegir y con Escape', async () => {
  await mob.click('#mobile-menu-btn');
  let r = await mob.evaluate(() => ({ open: !document.getElementById('mobile-menu').classList.contains('hidden'), exp: document.getElementById('mobile-menu-btn').getAttribute('aria-expanded') }));
  assert(r.open && r.exp === 'true', 'No abre');
  await mob.click('#mobile-menu a[href="#servicios"]');
  await sleep(100);
  r = await mob.evaluate(() => ({ open: !document.getElementById('mobile-menu').classList.contains('hidden'), exp: document.getElementById('mobile-menu-btn').getAttribute('aria-expanded') }));
  assert(!r.open && r.exp === 'false', 'No cierra al elegir');
  await mob.click('#mobile-menu-btn');
  await mob.keyboard.press('Escape');
  assert(await mob.$eval('#mobile-menu', (m) => m.classList.contains('hidden')), 'Escape no cierra');
});
await test('Móvil sin violaciones de accesibilidad', async () => {
  const v = await runAxe(mob);
  assert(!v.length, v.join('\n'));
});

console.log('\nOtras páginas');
await test('Política de privacidad carga sin errores y sin violaciones', async () => {
  const p = await open('/privacidad.html');
  const probs = await p.problems();
  assert(p.status === 200 && !probs.length, probs.join('\n'));
  const v = await runAxe(p);
  assert(!v.length, v.join('\n'));
  await p.close();
});
await test('Ruta inexistente devuelve 404 con página propia', async () => {
  const p = await browser.newPage();
  const res = await p.goto(url + '/no-existe', { waitUntil: 'networkidle0' });
  assert(res.status() === 404 && (await p.title()).includes('no encontrada'), 'Sin 404');
  await p.close();
});

console.log('\nSeguridad');
await test('Cabeceras de seguridad configuradas (CSP, HSTS, nosniff, frame, referrer)', async () => {
  const h = fs.readFileSync(path.join(DIST, '_headers'), 'utf8');
  for (const k of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']) assert(h.includes(k), `Falta ${k}`);
  assert(!/unsafe-inline|unsafe-eval/.test(h), 'La CSP permite unsafe-inline/eval');
});
await test('Sin manejadores inline (onclick/onerror) ni claves privadas en el código publicado', async () => {
  const files = fs.readdirSync(DIST, { recursive: true }).filter((f) => /\.(html|js)$/.test(f));
  for (const f of files) {
    const c = fs.readFileSync(path.join(DIST, f), 'utf8');
    assert(!/\son[a-z]+="/i.test(c), `${f}: tiene manejadores inline`);
    assert(!/(api[_-]?key|secret|private[_-]?key|password)\s*[:=]/i.test(c), `${f}: posible clave expuesta`);
  }
});
await test('Enlaces externos con rel="noopener"', async () => {
  const bad = await home.$$eval('a[target=_blank]', (as) => as.filter((a) => !/noopener/.test(a.rel)).map((a) => a.href));
  assert(!bad.length, bad.join(', '));
});

await browser.close();
server.close();

console.log(`\n${passed} pruebas OK, ${failures.length} fallidas`);
process.exit(failures.length ? 1 : 0);
