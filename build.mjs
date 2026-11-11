#!/usr/bin/env node
/**
 * Build de producción de Impulso Digital SGO.
 *
 *   npm run build        → genera dist/ listo para Netlify
 *   npm run dev          → build + servidor local en http://localhost:8080 con recarga al guardar
 *
 * Pasos: Tailwind CLI minificado · JS con esbuild · íconos SVG propios (sin CDN) ·
 * fuentes autoalojadas · portfolio/galería renderizados · SEO (JSON-LD, sitemap,
 * robots) · cabeceras de seguridad (_headers con CSP) · verificación de enlaces.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import sharp from 'sharp';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const NM = path.join(ROOT, 'node_modules');
const FA_DIR = path.join(NM, '@fortawesome/fontawesome-free/svgs');
const FONT_DIR = path.join(NM, '@fontsource-variable/plus-jakarta-sans/files');
const FONTS = ['plus-jakarta-sans-latin-wght-normal.woff2', 'plus-jakarta-sans-latin-ext-wght-normal.woff2'];
const PAGES = ['index.html', 'privacidad.html', '404.html'];

const warnings = [];
const warn = (m) => warnings.push(m);

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const hash = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
const get = (obj, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

function copyDir(from, to, skip = () => false) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (skip(a, entry)) continue;
    if (entry.isDirectory()) copyDir(a, b, skip);
    else fs.copyFileSync(a, b);
  }
}

/* ------------------------------------------------------------------ */
/* Configuración                                                       */
/* ------------------------------------------------------------------ */
function loadConfig() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
  const cfg = Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith('_')));

  cfg.siteUrl = (cfg.siteUrl || '').trim().replace(/\/+$/, '');
  if (cfg.siteUrl && !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(cfg.siteUrl)) {
    throw new Error(`siteUrl inválido: "${cfg.siteUrl}". Debe ser https://dominio sin rutas.`);
  }
  if (cfg.formspreeId && !/^[a-zA-Z0-9]{4,}$/.test(cfg.formspreeId)) {
    throw new Error(`formspreeId inválido: "${cfg.formspreeId}". Usá solo el ID final de la URL de Formspree.`);
  }
  if (!/^\d{10,15}$/.test(cfg.whatsapp || '')) {
    throw new Error('whatsapp debe ser el número completo con código de país, solo dígitos (ej: 5493851234567).');
  }
  if (cfg.gaMeasurementId && !/^G-[A-Z0-9]+$/.test(cfg.gaMeasurementId)) {
    throw new Error(`gaMeasurementId inválido: "${cfg.gaMeasurementId}".`);
  }
  if (cfg.impulsoSmartUrl && !/^https:\/\//.test(cfg.impulsoSmartUrl)) {
    throw new Error('impulsoSmartUrl debe empezar con https://');
  }
  [cfg.emailUser, cfg.emailDomain] = (cfg.email || '').split('@');

  if (!cfg.siteUrl) warn('siteUrl vacío: no se generan canonical, og:image, sitemap.xml ni URLs absolutas en Schema.org.');
  if (!cfg.formspreeId) warn('formspreeId vacío: el formulario derivará las consultas a WhatsApp hasta configurarlo.');
  return cfg;
}

/* ------------------------------------------------------------------ */
/* Portfolio y galería                                                 */
/* ------------------------------------------------------------------ */
const CATEGORIES = {
  software: { label: 'Software', color: 'text-cyber-cyan', icon: 'fa-solid fa-laptop-code', grad: 'from-cyber-primary/25 to-cyber-cyan/10' },
  datos: { label: 'Análisis de datos', color: 'text-cyber-violet', icon: 'fa-solid fa-chart-line', grad: 'from-cyber-violet/25 to-cyber-primary/10' },
  web: { label: 'Desarrollo web', color: 'text-emerald-400', icon: 'fa-solid fa-code', grad: 'from-emerald-500/20 to-cyber-cyan/10' },
  ciberseguridad: { label: 'Ciberseguridad', color: 'text-emerald-400', icon: 'fa-solid fa-shield-halved', grad: 'from-emerald-500/20 to-cyber-primary/10' },
};

const localFileExists = (url) => fs.existsSync(path.join(SRC, decodeURIComponent(url.replace(/^\//, '').split(/[?#]/)[0])));

function renderProject(p) {
  const cat = CATEGORIES[p.categoria];
  if (!cat) throw new Error(`Proyecto "${p.id}": categoría inválida "${p.categoria}".`);
  for (const f of ['id', 'nombre', 'descripcion', 'problema']) {
    if (!p[f]) throw new Error(`Proyecto "${p.id || '?'}": falta el campo "${f}".`);
  }
  let img = p.imagen;
  if (img && !localFileExists(img.src)) {
    warn(`Proyecto "${p.id}": no existe ${img.src}; se muestra sin captura.`);
    img = null;
  }
  if (!p.tecnologias?.length) warn(`Proyecto "${p.id}": sin tecnologías cargadas.`);

  const media = img
    ? `<button type="button" class="block w-full aspect-[16/10] bg-slate-900 overflow-hidden group" data-lightbox data-type="image" data-src="${esc(img.src)}" data-title="${esc(p.nombre)}" data-alt="${esc(img.alt)}" aria-label="Ampliar imagen de ${esc(p.nombre)}">
        <img src="${esc(img.src)}" alt="${esc(img.alt)}" width="${img.ancho}" height="${img.alto}" loading="lazy" decoding="async" class="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105">
      </button>`
    : `<div class="aspect-[16/10] bg-gradient-to-tr ${cat.grad} flex items-center justify-center" aria-hidden="true"><i class="${cat.icon} text-5xl ${cat.color} opacity-40"></i></div>`;

  const techs = p.tecnologias?.length
    ? `<ul class="flex flex-wrap gap-2 pt-1" aria-label="Tecnologías utilizadas">${p.tecnologias
        .map((t) => `<li class="text-[11px] font-mono bg-cyber-bg border border-cyber-border text-cyan-300 px-2 py-1 rounded-md">${esc(t)}</li>`)
        .join('')}</ul>`
    : '';

  let link = '';
  if (p.enlace) {
    const external = /^https?:\/\//.test(p.enlace.url);
    link = `<a href="${esc(p.enlace.url)}"${external ? ' target="_blank" rel="noopener"' : ''} class="mt-auto pt-4 text-sm font-bold text-cyber-cyan inline-flex items-center gap-2 hover:underline">${esc(p.enlace.texto || 'Ver proyecto')} <i class="fa-solid ${external ? 'fa-arrow-up-right-from-square' : 'fa-arrow-right'} text-[10px]"></i>${external ? '<span class="sr-only"> (abre en otra pestaña)</span>' : ''}</a>`;
  }

  return `<article class="filterable bg-cyber-card rounded-2xl overflow-hidden border border-cyber-border/80 hover:border-cyber-cyan transition-colors duration-300 flex flex-col" data-group="proyectos" data-category="${p.categoria}">
      ${media}
      <div class="p-6 space-y-3 flex-1 flex flex-col">
        <p class="text-[11px] font-bold uppercase tracking-widest ${cat.color}">${cat.label}</p>
        <h3 class="text-lg font-bold text-white">${esc(p.nombre)}</h3>
        <p class="text-sm text-slate-300 leading-relaxed">${esc(p.descripcion)}</p>
        <p class="text-sm text-slate-300 leading-relaxed"><strong class="text-white">Problema que resuelve:</strong> ${esc(p.problema)}</p>
        ${techs}
        ${link}
      </div>
    </article>`;
}

function renderGalleryItem(g) {
  if (!['imagen', 'video'].includes(g.tipo)) throw new Error(`Galería: tipo inválido "${g.tipo}".`);
  if (!localFileExists(g.src)) {
    warn(`Galería: no existe ${g.src}; el elemento se omite.`);
    return '';
  }
  const thumb = g.tipo === 'video' ? g.poster : g.src;
  if (g.tipo === 'video' && (!g.poster || !localFileExists(g.poster))) {
    warn(`Galería: el video ${g.src} no tiene poster válido (VID-002); el elemento se omite.`);
    return '';
  }
  const isVideo = g.tipo === 'video';
  return `<article class="filterable bg-cyber-card rounded-2xl overflow-hidden neon-border" data-group="galeria" data-category="${g.tipo}">
      <button type="button" class="block w-full text-left group" data-lightbox data-type="${isVideo ? 'video' : 'image'}" data-src="${esc(g.src)}"${isVideo ? ` data-poster="${esc(g.poster)}"` : ''} data-title="${esc(g.titulo)}" data-alt="${esc(g.alt || g.titulo)}" aria-label="${isVideo ? 'Reproducir video' : 'Ampliar imagen'}: ${esc(g.titulo)}">
        <span class="relative block overflow-hidden aspect-[4/3] bg-slate-900">
          <img src="${esc(thumb)}" alt="${esc(g.alt || g.titulo)}" width="${g.ancho || 800}" height="${g.alto || 600}" loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
          <span class="absolute inset-0 bg-cyber-bg/40 flex items-center justify-center ${isVideo ? '' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'} transition-opacity">
            <span class="bg-cyber-cyan text-black rounded-full p-4 shadow-xl transition-transform group-hover:scale-110"><i class="fa-solid ${isVideo ? 'fa-play' : 'fa-expand'} text-xs"></i></span>
          </span>
        </span>
        <span class="p-4 flex items-center justify-between gap-3">
          <span>
            <span class="text-[10px] font-bold text-cyber-cyan uppercase tracking-widest block">${esc(g.categoria || (isVideo ? 'Video' : 'Imagen'))}</span>
            <span class="text-sm font-bold text-white">${esc(g.titulo)}</span>
          </span>
          <i class="${isVideo ? 'fa-solid fa-video' : 'fa-regular fa-image'} text-slate-400 text-sm"></i>
        </span>
      </button>
    </article>`;
}

/* ------------------------------------------------------------------ */
/* Schema.org (JSON-LD)                                                */
/* ------------------------------------------------------------------ */
function jsonLd(cfg) {
  const url = cfg.siteUrl;
  const org = {
    '@type': 'Organization',
    ...(url && { '@id': `${url}/#organizacion`, url, logo: `${url}/favicon-512.png` }),
    name: cfg.businessName,
    description: 'Empresa tecnológica especializada en desarrollo de software, análisis y visualización de datos, ciberseguridad y soluciones digitales para empresas y comercios.',
    email: cfg.email,
    telephone: `+${cfg.whatsapp}`,
    address: { '@type': 'PostalAddress', addressLocality: cfg.city, addressRegion: cfg.region, addressCountry: cfg.country },
    areaServed: { '@type': 'Country', name: 'Argentina' },
    sameAs: Object.values(cfg.social || {}).filter(Boolean),
    knowsAbout: ['Desarrollo de software', 'Análisis de datos', 'Visualización de datos', 'Inteligencia de negocios', 'Ciberseguridad'],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Servicios',
      itemListElement: ['Desarrollo de software', 'Análisis de datos', 'Ciberseguridad'].map((name) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name },
      })),
    },
  };
  const graph = [
    org,
    {
      '@type': 'SoftwareApplication',
      name: 'Impulso Smart',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Punto de venta (POS)',
      operatingSystem: 'Web',
      description: 'Sistema POS web para comercios y negocios, con prueba gratuita de 30 días.',
      ...(cfg.impulsoSmartUrl && { url: cfg.impulsoSmartUrl }),
      publisher: url ? { '@id': `${url}/#organizacion` } : { '@type': 'Organization', name: cfg.businessName },
    },
  ];
  if (url) {
    graph.push({ '@type': 'WebSite', '@id': `${url}/#sitio`, url: `${url}/`, name: cfg.businessName, inLanguage: 'es-AR', publisher: { '@id': `${url}/#organizacion` } });
  }
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

/* ------------------------------------------------------------------ */
/* Íconos: <i class="fa-solid fa-x ..."></i> → <svg><use href="#i-solid-x">  */
/* ------------------------------------------------------------------ */
const ICON_RE = /<i class="([^"]*\bfa-(?:solid|regular|brands)\b[^"]*)"([^>]*)><\/i>/g;

function replaceIcons(html, used) {
  return html.replace(ICON_RE, (_m, classes, attrs) => {
    const list = classes.split(/\s+/).filter(Boolean);
    const style = list.find((c) => /^fa-(solid|regular|brands)$/.test(c)).slice(3);
    const name = list.find((c) => c.startsWith('fa-') && !/^fa-(solid|regular|brands)$/.test(c))?.slice(3);
    if (!name) throw new Error(`Ícono sin nombre: ${classes}`);
    const file = path.join(FA_DIR, style, `${name}.svg`);
    if (!fs.existsSync(file)) throw new Error(`Ícono inexistente en Font Awesome Free: ${style}/${name}`);
    used.add(`${style}/${name}`);
    const rest = list.filter((c) => !c.startsWith('fa-')).join(' ');
    return `<svg class="icon${rest ? ' ' + rest : ''}" aria-hidden="true" focusable="false"${attrs}><use href="#i-${style}-${name}"></use></svg>`;
  });
}

function buildSprite(used) {
  const symbols = [...used].sort().map((key) => {
    const [style, name] = key.split('/');
    const svg = fs.readFileSync(path.join(FA_DIR, style, `${name}.svg`), 'utf8');
    const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
    const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<!--[\s\S]*?-->/g, '');
    return `<symbol id="i-${style}-${name}" viewBox="${viewBox}">${inner}</symbol>`;
  });
  const logo = fs.readFileSync(path.join(SRC, 'images/logo.svg'), 'utf8');
  const logoInner = logo.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\n\s*/g, '');
  return (
    '<!-- Íconos: Font Awesome Free 6 by @fontawesome - https://fontawesome.com · Licencia CC BY 4.0 - https://fontawesome.com/license/free -->\n' +
    `<svg xmlns="http://www.w3.org/2000/svg" class="sr-only" aria-hidden="true" focusable="false"><symbol id="logo-rocket" viewBox="0 0 100 100">${logoInner}</symbol>${symbols.join('')}</svg>`
  );
}

/* ------------------------------------------------------------------ */
/* Plantillas                                                          */
/* ------------------------------------------------------------------ */
const RAW_KEYS = new Set(['JSON_LD', 'PROJECTS', 'GALLERY', 'ICON_SPRITE']);

function renderTemplate(html, ctx, flags, cfg) {
  html = html.replace(/[ \t]*<!--IF (\w+)-->\n?([\s\S]*?)[ \t]*<!--ENDIF-->\n?/g, (_m, flag, body) => {
    if (!(flag in flags)) throw new Error(`Condición desconocida en plantilla: ${flag}`);
    return flags[flag] ? body : '';
  });
  html = html.replace(/\{\{wa:([^}]+)\}\}/g, (_m, text) => esc(`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(text.trim())}`));
  html = html.replace(/\{\{([\w.]+)\}\}/g, (_m, key) => {
    const v = get(ctx, key);
    if (v === undefined) throw new Error(`Variable de plantilla sin valor: {{${key}}}`);
    return RAW_KEYS.has(key) ? v : esc(v);
  });
  return html;
}

/* ------------------------------------------------------------------ */
/* Cabeceras de seguridad y caché (Netlify _headers)                   */
/* ------------------------------------------------------------------ */
function headersFile(cfg) {
  const ga = !!cfg.gaMeasurementId;
  const csp = [
    "default-src 'self'",
    `script-src 'self'${ga ? ' https://www.googletagmanager.com' : ''}`,
    "style-src 'self'",
    `img-src 'self' data:${ga ? ' https://*.google-analytics.com https://*.googletagmanager.com' : ''}`,
    "font-src 'self'",
    `connect-src 'self' https://formspree.io${ga ? ' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com' : ''}`,
    "media-src 'self'",
    "form-action 'self' https://formspree.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
  return `/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/images/*
  Cache-Control: public, max-age=604800

/videos/*
  Cache-Control: public, max-age=604800

/favicon*
  Cache-Control: public, max-age=604800
`;
}

/* ------------------------------------------------------------------ */
/* Verificación: ningún enlace interno ni recurso roto                 */
/* ------------------------------------------------------------------ */
function verifyLinks() {
  const errors = [];
  for (const page of PAGES) {
    const html = fs.readFileSync(path.join(DIST, page), 'utf8');
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const [, attr, value] of html.matchAll(/\s(href|src|poster|data-src|data-poster)="([^"]*)"/g)) {
      if (/^(https?:|mailto:|tel:|data:)/.test(value)) continue;
      if (value === '' && attr === 'href') { errors.push(`${page}: href vacío`); continue; }
      if (value.startsWith('#')) {
        if (value === '#' ) errors.push(`${page}: enlace ficticio href="#"`);
        else if (!ids.has(value.slice(1))) errors.push(`${page}: ancla inexistente ${value}`);
        continue;
      }
      const [file, anchor] = value.split('#');
      const target = path.join(DIST, decodeURIComponent(file.replace(/^\//, '')) || 'index.html');
      const resolved = fs.existsSync(target) && fs.statSync(target).isDirectory() ? path.join(target, 'index.html') : target;
      if (!fs.existsSync(resolved)) errors.push(`${page}: recurso inexistente ${value}`);
      else if (anchor && resolved.endsWith('.html')) {
        const other = fs.readFileSync(resolved, 'utf8');
        if (!other.includes(`id="${anchor}"`)) errors.push(`${page}: ancla inexistente ${value}`);
      }
    }
    if (/URL_DE_TU_PAGINA|TU-DOMINIO|placehold\.co|cdn\.tailwindcss|\{\{/.test(html)) {
      errors.push(`${page}: contiene marcadores sin reemplazar o recursos de prueba`);
    }
  }
  if (errors.length) throw new Error('Verificación de enlaces fallida:\n  - ' + errors.join('\n  - '));
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */
async function build() {
  const t0 = Date.now();
  warnings.length = 0;
  const cfg = loadConfig();
  const { proyectos, galeria } = await import(`${pathToFileURL(path.join(SRC, 'data/contenido.mjs')).href}?t=${Date.now()}`);

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });

  // 1. CSS (Tailwind CLI, minificado)
  const tmpCss = path.join(DIST, 'assets', '_tmp.css');
  const tw = spawnSync(path.join(NM, '.bin/tailwindcss'), ['-c', 'tailwind.config.js', '-i', 'src/css/input.css', '-o', tmpCss, '--minify'], { cwd: ROOT, encoding: 'utf8' });
  if (tw.status !== 0) throw new Error('Tailwind falló:\n' + tw.stderr);
  const css = fs.readFileSync(tmpCss);
  fs.rmSync(tmpCss);
  const cssPath = `assets/styles.${hash(css)}.css`;
  fs.writeFileSync(path.join(DIST, cssPath), css);

  // 2. JS (esbuild, minificado)
  const js = await esbuild.build({
    entryPoints: [path.join(SRC, 'js/main.js')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020'],
    write: false,
    legalComments: 'none',
    define: { __WHATSAPP__: JSON.stringify(cfg.whatsapp), __GA_ID__: JSON.stringify(cfg.gaMeasurementId || '') },
  });
  const jsBuf = Buffer.from(js.outputFiles[0].contents);
  const jsPath = `assets/main.${hash(jsBuf)}.js`;
  fs.writeFileSync(path.join(DIST, jsPath), jsBuf);

  // 3. Recursos estáticos
  copyDir(path.join(SRC, 'images'), path.join(DIST, 'images'), (p) => p.includes(`${path.sep}originales`) || path.basename(p) === '.gitkeep');
  copyDir(path.join(SRC, 'videos'), path.join(DIST, 'videos'), (p) => path.basename(p) === '.gitkeep');
  fs.mkdirSync(path.join(DIST, 'fonts'), { recursive: true });
  for (const f of FONTS) fs.copyFileSync(path.join(FONT_DIR, f), path.join(DIST, 'fonts', f));

  // 4. Favicons desde el logo
  const logo = fs.readFileSync(path.join(SRC, 'images/logo.svg'));
  fs.writeFileSync(path.join(DIST, 'favicon.svg'), logo);
  const bg = { r: 5, g: 7, b: 15, alpha: 1 };
  await sharp(logo, { density: 300 }).resize(32, 32).png().toFile(path.join(DIST, 'favicon-32.png'));
  await sharp(logo, { density: 600 }).resize(150, 150).extend({ top: 15, bottom: 15, left: 15, right: 15, background: bg }).flatten({ background: bg }).png().toFile(path.join(DIST, 'apple-touch-icon.png'));
  await sharp(logo, { density: 1200 }).resize(440, 440).extend({ top: 36, bottom: 36, left: 36, right: 36, background: bg }).flatten({ background: bg }).png().toFile(path.join(DIST, 'favicon-512.png'));
  if (!fs.existsSync(path.join(SRC, 'images/og-preview.jpg'))) warn('Falta src/images/og-preview.jpg (ejecutar `npm run og`).');

  // 5. HTML
  const projectsHtml = proyectos.map(renderProject).join('\n');
  const galleryHtml = galeria.map(renderGalleryItem).filter(Boolean).join('\n');
  const flags = {
    siteUrl: !!cfg.siteUrl,
    googleSiteVerification: !!cfg.googleSiteVerification,
    gaMeasurementId: !!cfg.gaMeasurementId,
    impulsoSmartUrl: !!cfg.impulsoSmartUrl,
    gallery: galleryHtml.length > 0,
  };
  const ctx = {
    ...cfg,
    ICON_SPRITE: '{{ICON_SPRITE}}',
    CSS_PATH: cssPath,
    JS_PATH: jsPath,
    YEAR: String(new Date().getFullYear()),
    FORM_ACTION: cfg.formspreeId ? `https://formspree.io/f/${cfg.formspreeId}` : '',
    JSON_LD: jsonLd(cfg),
    PROJECTS: projectsHtml,
    GALLERY: galleryHtml,
  };

  for (const page of PAGES) {
    let html = fs.readFileSync(path.join(SRC, page), 'utf8');
    html = renderTemplate(html, ctx, flags, cfg);
    const used = new Set();
    html = replaceIcons(html, used);
    html = html.replace('{{ICON_SPRITE}}', buildSprite(used));
    if (!cfg.formspreeId) html = html.replace(/ action="" method="POST"/, ' method="POST"');
    fs.writeFileSync(path.join(DIST, page), html);
  }

  // 6. SEO técnico
  const robots = ['User-agent: *', 'Allow: /', 'Disallow: /404.html'];
  if (cfg.siteUrl) {
    robots.push('', `Sitemap: ${cfg.siteUrl}/sitemap.xml`);
    const urls = [
      { loc: `${cfg.siteUrl}/`, priority: '1.0' },
      { loc: `${cfg.siteUrl}/privacidad.html`, priority: '0.3' },
    ];
    fs.writeFileSync(
      path.join(DIST, 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map((u) => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`)
        .join('\n')}\n</urlset>\n`,
    );
  }
  fs.writeFileSync(path.join(DIST, 'robots.txt'), robots.join('\n') + '\n');

  // 7. Seguridad
  fs.writeFileSync(path.join(DIST, '_headers'), headersFile(cfg));

  // 8. Verificación
  verifyLinks();

  console.log(`✔ Build OK en ${Date.now() - t0} ms → dist/  (css ${(css.length / 1024).toFixed(1)} KB · js ${(jsBuf.length / 1024).toFixed(1)} KB)`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}

/* ------------------------------------------------------------------ */
/* Servidor de desarrollo (aplica las mismas cabeceras que Netlify)    */
/* ------------------------------------------------------------------ */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.xml': 'application/xml', '.txt': 'text/plain',
};

function serve(port = Number(process.env.PORT) || 8080) {
  const globalHeaders = () => {
    const txt = fs.readFileSync(path.join(DIST, '_headers'), 'utf8').split(/\n\n/)[0];
    return Object.fromEntries(txt.split('\n').slice(1).map((l) => l.trim().split(/:\s(.+)/).slice(0, 2)));
  };
  http
    .createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      let file = path.join(DIST, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
      let status = 200;
      if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        file = path.join(DIST, '404.html');
        status = 404;
      }
      const headers = { ...globalHeaders(), 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' };
      delete headers['Strict-Transport-Security'];
      // En local (http) no se fuerza HTTPS
      headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace('; upgrade-insecure-requests', '');
      res.writeHead(status, headers);
      fs.createReadStream(file).pipe(res);
    })
    .listen(port, () => console.log(`→ http://localhost:${port}`));
}

try {
  await build();
} catch (e) {
  console.error('✖', e.message);
  process.exit(1);
}

if (process.argv.includes('--serve')) {
  serve();
  let timer;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch((e) => console.error('✖', e.message)), 150);
  };
  fs.watch(SRC, { recursive: true }, rebuild);
  fs.watch(path.join(ROOT, 'site.config.json'), rebuild);
}
