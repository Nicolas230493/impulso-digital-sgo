# Impulso Digital SGO: sitio corporativo v2.0

Documentación del proyecto de mejora (spec v1.0, noviembre 2026).
Los archivos originales están intactos en `respaldo-original/`.

## Uso rápido

```bash
npm install        # una sola vez
npm run dev        # build + servidor local en http://localhost:8080 (se reconstruye al guardar)
npm run build      # genera dist/ (lo que se publica)
npm test           # build + 38 pruebas automáticas (navegación, formulario, a11y, seguridad…)
npm run images     # optimiza fotos: src/images/originales/*.jpg|png → WebP
npm run og         # regenera la imagen para redes y la captura del sitio
```

## Estructura

```
site.config.json        ← DATOS DEL SITIO: dominio, Formspree, WhatsApp, email, redes
src/
  index.html            Página principal (plantilla)
  privacidad.html       Política de privacidad (Ley 25.326)
  404.html              Página de error
  data/contenido.mjs    ← PORTFOLIO Y GALERÍA (se editan acá)
  css/input.css         Estilos (Tailwind + componentes propios)
  js/main.js            Interactividad
  images/  videos/      Recursos multimedia
build.mjs               Build de producción
tools/                  Pruebas, imagen OG, optimización de imágenes
netlify.toml            Configuración de despliegue
```

## Pasos para publicar (en orden)

1. **Formspree**: crear una cuenta en formspree.io con el correo de destino y luego un formulario nuevo.
   Copiar el ID (lo que sigue a `/f/` en la URL) en `formspreeId`.
   En el panel de Formspree, activar reCAPTCHA o la protección anti-spam que ofrezca el plan.
2. **Netlify**: subir el proyecto a un repositorio (GitHub, por ejemplo), en Netlify elegir *Add new site → Import from Git*.
   El `netlify.toml` ya define el build. HTTPS se activa solo.
3. **Dominio**: conectarlo en Netlify (*Domain management*) y cargarlo en `siteUrl`
   (por ejemplo `https://www.dominio.com.ar`). Eso activa canonical, Open Graph con imagen,
   `sitemap.xml` y las URLs de Schema.org.
4. **Google Search Console**: agregar la propiedad. Si se verifica por *etiqueta HTML*, cargar el token en
   `googleSiteVerification`. Después, enviar `https://DOMINIO/sitemap.xml` en *Sitemaps*.
5. *(Opcional)* **Google Analytics 4**: cargar el ID `G-…` en `gaMeasurementId`. La CSP se ajusta sola.
   Las conversiones ya se registran en `dataLayer`: `generate_lead`, `whatsapp_click` (con `ubicacion`),
   `service_select`, `email_click` y `lightbox_open`. En GA4, marcar `generate_lead` y `whatsapp_click` como conversiones.
6. Hacer commit de los cambios: Netlify vuelve a publicar automáticamente.
7. Verificar en producción con PageSpeed Insights y con el depurador de Facebook o LinkedIn (vista previa al compartir).

## Cómo agregar contenido

**Proyecto al portfolio**: agregar un objeto en `proyectos` dentro de `src/data/contenido.mjs`
(nombre, categoría, descripción, problema, tecnologías, captura y enlace). El build valida los campos
y avisa si falta una imagen. Los filtros por categoría funcionan solos.

**Galería**: agregar elementos en `galeria`. La sección y su enlace en el menú **aparecen solo
cuando hay elementos**. Los videos requieren `poster` (imagen de respaldo, VID-002); si falta, el
build los omite.

**Imágenes**: copiar los originales en `src/images/originales/` y ejecutar `npm run images`.
Se generan versiones WebP de hasta 1600 px más una miniatura `-mini.webp` de 480 px, y se imprimen
sus dimensiones para el `contenido.mjs`. La grilla usa la miniatura y el lightbox, la imagen grande.
Para logos u otras piezas que no deben recortarse, agregar `encuadre: 'contener'`.
Los filtros de la galería (Imágenes/Videos) aparecen solo cuando hay de los dos tipos.

## Qué se modificó, por fase

### Fase 1: estabilización ✅
- Se eliminaron las tarjetas `URL_DE_TU_PAGINA_1/2/3` y los enlaces `href="#"` del pie.
- Se corrigió el enlace de LinkedIn: apuntaba al **panel de administrador** (`/admin/...`).
- Se quitaron las imágenes y videos inexistentes y los placeholders externos (`placehold.co`).
  La galería ahora solo se publica con contenido real, y los videos exigen poster.
- Se corrigió el bug del switch de precios: mostraba "Trimestral" con precios mensuales. La sección se retiró en la Fase 2.
- Se definió `animate-fade-in`, que se usaba pero no existía, y el gradiente del logo del pie, que estaba roto.
- El build **falla** si encuentra un enlace interno, ancla o recurso inexistente.

### Fase 2: identidad y contenido ✅ (con contenido para validar)
- Se cambió el enfoque de "agencia de marketing" a empresa de **software, datos y ciberseguridad**.
- Secciones nuevas: Nosotros (presentación, misión, visión, propuesta de valor, diferenciales),
  Servicios (3 bloques), **Impulso Smart** destacado (web, 30 días gratis, funcionalidades, CTA comercial)
  más una sección de próximos productos, y portfolio con 4 filtros y estado vacío.
- **Se retiraron**: el simulador ROI de pauta, los planes de precios de marketing, los clientes del hero
  ("Distribuidora Sol", etc.) y las métricas no verificables (+312 %, +1.2M ventas…).
  Si alguno es real y verificable, se puede volver a incorporar.

### Fase 3: SEO ✅ (parte depende del dominio)
- Title, description, robots, theme-color, favicon (SVG, PNG 32, Apple 180, 512), Open Graph y Twitter Card.
- Imagen `og-preview.jpg` de 1200×630 generada con la identidad visual.
- Schema.org: Organization (servicios, redes, dirección), SoftwareApplication (Impulso Smart) y WebSite.
- `robots.txt` y `sitemap.xml`, con jerarquía de títulos corregida: un único H1 y sin saltos.
- Contenido del portfolio renderizado en HTML (indexable, no depende de JavaScript).

### Fase 4: captación ✅ (requiere `formspreeId`)
- Formulario con los 6 campos del spec, más el consentimiento de datos con enlace a la política de privacidad.
- Validación accesible: mensajes por campo, `aria-invalid`, foco en el primer error y validación del correo.
- Anti-spam: campo trampa (`_gotcha` de Formspree) y tiempo mínimo de llenado.
- Envío real a Formspree con confirmación y manejo de errores. **Si Formspree falla o no está
  configurado, se ofrece enviar la misma consulta por WhatsApp**, así que ninguna consulta se pierde.
- WhatsApp: botón flotante y mensajes personalizados por servicio, por Impulso Smart y por formulario,
  con seguimiento de cada clic.
- El correo se arma con JavaScript para dificultar que lo recolecten los bots de spam.

### Fase 5: optimización y accesibilidad ✅
- PERF-001/002: se eliminó el CDN de Tailwind. El CSS se compila con Tailwind CLI y queda en **34 KB** minificado.
- PERF-003: JS minificado con esbuild (**8 KB**).
- PERF-006: **cero recursos externos**. Google Fonts y Font Awesome se reemplazaron por la fuente
  autoalojada y un sprite SVG con solo los íconos que se usan.
- PERF-004/005: carga diferida y dimensiones explícitas en imágenes (CLS = 0), más el script de WebP.
- PERF-007: caché inmutable para assets con hash. Netlify aplica la compresión.
- Accesibilidad: lightbox con `role="dialog"`, Escape, foco atrapado y devuelto, cierre al hacer clic afuera;
  menú con `aria-expanded`; enlace "Saltar al contenido"; foco visible; `aria-label` en botones de ícono;
  respeto de `prefers-reduced-motion`. Se ajustaron colores con bajo contraste: el violeta pasó
  de `#6366F1` a `#818CF8`, y los textos chicos de `slate-500` a `slate-300/400`.
- Lighthouse (escritorio): **Rendimiento 94 · Accesibilidad 100 · Buenas prácticas 100 · SEO 100**.
  La medición móvil local no es representativa por la carga de la máquina de pruebas: hay que medirla en producción con PageSpeed Insights.

### Fase 6: seguridad y pruebas ✅ (publicación pendiente)
- `_headers` con CSP estricta (sin `unsafe-inline`), HSTS, nosniff, X-Frame-Options, Referrer-Policy
  y Permissions-Policy.
- Sin manejadores `onclick` en línea. Todo el contenido dinámico se inserta como texto (sin XSS).
- No hay claves privadas: el ID de Formspree es público por diseño.
- `npm test` cubre la tabla de pruebas del spec: navegación desktop y móvil, formulario (éxito, error,
  spam y XSS), WhatsApp, lightbox, SEO, accesibilidad (axe-core, WCAG 2.1 AA) y seguridad.

## Definición de terminado

- [x] No existen enlaces ficticios (el build lo verifica)
- [x] No existen recursos multimedia rotos (el build y las pruebas lo verifican)
- [x] Todos los servicios están presentados
- [x] Impulso Smart tiene presentación comercial
- [ ] El formulario envía información real → **falta cargar `formspreeId`** (el código está listo y probado)
- [x] WhatsApp funciona
- [x] SEO y Open Graph implementados → **las URLs absolutas se activan al cargar `siteUrl`**
- [x] Optimizado para móviles (sin scroll horizontal, menú accesible)
- [x] Problemas críticos de accesibilidad corregidos (axe: 0 violaciones)
- [x] Pruebas de seguridad realizadas
- [ ] Publicado y verificado en el dominio definitivo

## Pendientes que requieren información de la empresa

| Pendiente | Dónde se carga |
|---|---|
| ID de Formspree | `site.config.json` → `formspreeId` |
| Dominio definitivo | `site.config.json` → `siteUrl` |
| URL pública de Impulso Smart | `site.config.json` → `impulsoSmartUrl` |
| Funcionalidades reales de Impulso Smart (hoy hay 6 genéricas de un POS: **validar**) | `src/index.html`, sección `#impulso-smart` |
| Tecnologías con las que se construyó Impulso Smart | `src/data/contenido.mjs` |
| Capturas reales de Impulso Smart (hoy hay una ilustración) | `src/images/proyectos/` y `contenido.mjs` |
| Proyectos reales de datos, ciberseguridad y otros | `src/data/contenido.mjs` |
| Galería: hay 12 piezas de diseño de clientes, recuperadas del repo anterior. Sumar videos o fotos del equipo si se quiere | `src/images/originales/galeria/`, `src/videos/` y `contenido.mjs` |
| Revisar textos de misión, visión y propuesta de valor (son una propuesta) | `src/index.html`, sección `#nosotros` |
| Confirmar WhatsApp **+54 11** (Buenos Aires) frente a la ubicación en Santiago del Estero | `site.config.json` |
| Recomendado: correo con dominio propio en lugar de Gmail personal | `site.config.json` → `email` |
| Revisión legal de la política de privacidad | `src/privacidad.html` |
