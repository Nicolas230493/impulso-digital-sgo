/* Impulso Digital SGO — interactividad del sitio.
 * Las constantes __WHATSAPP__ y __GA_ID__ las inyecta el build desde site.config.json.
 */

/* global __WHATSAPP__, __GA_ID__ */
const WHATSAPP_NUMBER = __WHATSAPP__;
const GA_ID = __GA_ID__;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ------------------------------------------------------------------ */
/* Seguimiento de conversiones                                         */
/* ------------------------------------------------------------------ */
window.dataLayer = window.dataLayer || [];

function track(event, params = {}) {
  window.dataLayer.push({ event, ...params });
  if (typeof window.gtag === 'function') window.gtag('event', event, params);
}

if (GA_ID) {
  window.gtag = function gtag() {
    window.dataLayer.push(arguments); // eslint-disable-line prefer-rest-params
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { anonymize_ip: true });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
}

$$('[data-wa]').forEach((link) => {
  link.addEventListener('click', () => track('whatsapp_click', { ubicacion: link.dataset.wa }));
});

/* ------------------------------------------------------------------ */
/* Menú móvil                                                          */
/* ------------------------------------------------------------------ */
const menuBtn = $('#mobile-menu-btn');
const menu = $('#mobile-menu');

function setMenu(open) {
  if (!menuBtn || !menu) return;
  menu.classList.toggle('hidden', !open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  $('[data-menu-icon="open"]', menuBtn)?.classList.toggle('hidden', open);
  $('[data-menu-icon="close"]', menuBtn)?.classList.toggle('hidden', !open);
}

if (menuBtn && menu) {
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuBtn.focus();
    }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (mq) => {
    if (mq.matches) setMenu(false);
  });
}

/* ------------------------------------------------------------------ */
/* Filtros (portfolio y galería)                                       */
/* ------------------------------------------------------------------ */
$$('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const group = btn.dataset.target;
    const filter = btn.dataset.filter;

    $$(`.filter-btn[data-target="${group}"]`).forEach((b) =>
      b.setAttribute('aria-pressed', String(b === btn)),
    );

    let visible = 0;
    $$(`.filterable[data-group="${group}"]`).forEach((item) => {
      const show = filter === 'all' || item.dataset.category === filter;
      item.classList.toggle('is-hidden', !show);
      if (show) {
        visible += 1;
        item.classList.remove('animate-fade-in');
        void item.offsetWidth; // reinicia la animación
        item.classList.add('animate-fade-in');
      }
    });

    const empty = $(`#${group}-empty`);
    if (empty) empty.classList.toggle('hidden', visible > 0);
  });
});

/* ------------------------------------------------------------------ */
/* Lightbox accesible (role=dialog, Escape, foco atrapado y devuelto)  */
/* ------------------------------------------------------------------ */
const lightbox = $('#lightbox');
const lbContent = $('#lightbox-content');
const lbTitle = $('#lightbox-title');
const lbClose = $('#lightbox-close');
let lbOpener = null;

function focusables(root) {
  return $$('a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])', root).filter(
    (el) => el.offsetParent !== null,
  );
}

function openLightbox(trigger) {
  if (!lightbox || !lbContent || !lbTitle) return;
  const { type, src, title, alt, poster } = trigger.dataset;
  lbOpener = trigger;
  lbContent.replaceChildren();
  lbTitle.textContent = title || '';

  if (type === 'video') {
    const video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    if (poster) video.poster = poster;
    video.className = 'max-w-full max-h-[70vh] object-contain rounded-xl animate-fade-in';
    video.textContent = 'Tu navegador no puede reproducir este video.';
    lbContent.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || title || '';
    img.className = 'max-w-full max-h-[70vh] object-contain rounded-xl animate-fade-in';
    lbContent.appendChild(img);
  }

  lightbox.classList.remove('hidden');
  lightbox.classList.add('flex');
  document.body.classList.add('overflow-hidden');
  lbClose?.focus();
  track('lightbox_open', { elemento: title || src });
}

function closeLightbox() {
  if (!lightbox || lightbox.classList.contains('hidden')) return;
  lightbox.classList.add('hidden');
  lightbox.classList.remove('flex');
  lbContent.replaceChildren(); // detiene el video
  document.body.classList.remove('overflow-hidden');
  if (lbOpener) lbOpener.focus();
  lbOpener = null;
}

if (lightbox) {
  $$('[data-lightbox]').forEach((t) => t.addEventListener('click', () => openLightbox(t)));
  lbClose?.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('hidden')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeLightbox();
    } else if (e.key === 'Tab') {
      const items = focusables(lightbox);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

/* Respaldo de videos de la galería: si el archivo falla, queda el poster */
$$('video[data-fallback]').forEach((v) => {
  v.addEventListener('error', () => v.removeAttribute('autoplay'), true);
});

/* ------------------------------------------------------------------ */
/* Email (armado en JS para dificultar la recolección por bots)       */
/* ------------------------------------------------------------------ */
$$('[data-email-user]').forEach((a) => {
  const { emailUser, emailDomain } = a.dataset;
  if (!emailUser || !emailDomain) return;
  const addr = `${emailUser}@${emailDomain}`;
  a.href = `mailto:${addr}`;
  a.textContent = addr;
  a.addEventListener('click', () => track('email_click'));
});

/* ------------------------------------------------------------------ */
/* Formulario de contacto                                              */
/* ------------------------------------------------------------------ */
const form = $('#contact-form');
const formCard = $('#form-card');
const statusBox = $('#form-status');
const successBox = $('#form-success');
const submitBtn = $('#form-submit');
const formLoadedAt = Date.now();

const SERVICE_MESSAGES = {
  'Desarrollo de software': 'Hola, quisiera consultar por un desarrollo de software para mi empresa.',
  'Análisis de datos': 'Hola, quisiera consultar por análisis y visualización de datos.',
  Ciberseguridad: 'Hola, quisiera consultar por servicios de ciberseguridad.',
  'Impulso Smart - Prueba gratuita': 'Hola, quiero activar la prueba gratuita de 30 días de Impulso Smart para mi comercio.',
  Otro: '',
};

function highlightForm() {
  if (!formCard) return;
  formCard.classList.add('ring-2', 'ring-cyber-cyan');
  setTimeout(() => formCard.classList.remove('ring-2', 'ring-cyber-cyan'), 2000);
}

// Preselección de servicio desde los botones "Consultar"
$$('[data-service]').forEach((link) => {
  link.addEventListener('click', () => {
    const service = link.dataset.service;
    const select = $('#form-service');
    const message = $('#form-message');
    if (select) select.value = service;
    if (message && !message.value.trim() && SERVICE_MESSAGES[service]) {
      message.value = SERVICE_MESSAGES[service];
    }
    track('service_select', { servicio: service });
    highlightForm();
  });
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s().-]{5,}$/;

const VALIDATORS = {
  nombre: (v) => (v.trim().length < 2 ? 'Ingresá tu nombre (mínimo 2 caracteres).' : ''),
  email: (v) => (!v.trim() ? 'Ingresá tu correo electrónico.' : !EMAIL_RE.test(v.trim()) ? 'El correo no parece válido. Revisalo, por ejemplo: nombre@empresa.com' : ''),
  telefono: (v) => (v.trim() && !PHONE_RE.test(v.trim()) ? 'El teléfono solo puede tener números, espacios, +, guiones y paréntesis.' : ''),
  servicio: (v) => (!v ? 'Elegí el servicio que te interesa.' : ''),
  mensaje: (v) => (v.trim().length < 10 ? 'Contanos un poco más (mínimo 10 caracteres).' : ''),
  consentimiento: (_v, el) => (!el.checked ? 'Necesitamos tu aceptación para poder responderte.' : ''),
};

function setFieldError(el, msg) {
  const err = $(`#${el.id}-error`);
  if (msg) {
    el.setAttribute('aria-invalid', 'true');
    if (err) {
      err.textContent = msg;
      err.hidden = false;
    }
  } else {
    el.removeAttribute('aria-invalid');
    if (err) {
      err.textContent = '';
      err.hidden = true;
    }
  }
}

function validateField(el) {
  const fn = VALIDATORS[el.name];
  if (!fn) return true;
  const msg = fn(el.value, el);
  setFieldError(el, msg);
  return !msg;
}

function validateForm() {
  let firstInvalid = null;
  Object.keys(VALIDATORS).forEach((name) => {
    const el = form.elements[name];
    if (el && !validateField(el) && !firstInvalid) firstInvalid = el;
  });
  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

function showStatus(type, html) {
  if (!statusBox) return;
  statusBox.className =
    'text-sm rounded-xl p-4 ' +
    (type === 'error'
      ? 'bg-red-500/10 border border-red-400/40 text-red-200'
      : 'bg-cyber-primary/10 border border-cyber-primary/40 text-slate-200');
  statusBox.replaceChildren(...html);
  statusBox.classList.remove('hidden');
}

function waLinkFromForm() {
  const v = (n) => (form.elements[n]?.value || '').trim();
  const lines = [
    '¡Hola Impulso Digital SGO!',
    '',
    `• Nombre: ${v('nombre') || 'Sin especificar'}`,
    v('empresa') ? `• Empresa: ${v('empresa')}` : null,
    v('email') ? `• Email: ${v('email')}` : null,
    v('telefono') ? `• Teléfono: ${v('telefono')}` : null,
    `• Servicio: ${v('servicio') || 'Consulta general'}`,
    '',
    v('mensaje') || 'Quisiera recibir más información.',
  ].filter((l) => l !== null);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
}

function waFallbackNodes(prefix) {
  const p = document.createElement('span');
  p.textContent = prefix + ' ';
  const a = document.createElement('a');
  a.href = waLinkFromForm();
  a.target = '_blank';
  a.rel = 'noopener';
  a.className = 'font-bold text-emerald-300 underline';
  a.textContent = 'Enviala por WhatsApp';
  a.addEventListener('click', () => track('whatsapp_click', { ubicacion: 'fallback-formulario' }));
  return [p, a, document.createTextNode('.')];
}

function setSubmitting(on) {
  if (!submitBtn) return;
  submitBtn.disabled = on;
  const label = $('[data-submit-label]', submitBtn);
  if (label) label.textContent = on ? 'Enviando…' : 'Enviar consulta';
}

if (form) {
  // Validación en vivo después de la primera interacción
  $$('input, select, textarea', form).forEach((el) => {
    el.addEventListener('blur', () => {
      if (el.value || el.getAttribute('aria-invalid')) validateField(el);
    });
    el.addEventListener('input', () => {
      if (el.getAttribute('aria-invalid')) validateField(el);
    });
    el.addEventListener('change', () => {
      if (el.getAttribute('aria-invalid')) validateField(el);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusBox?.classList.add('hidden');
    if (!validateForm()) return;

    // Anti-spam: campo trampa y tiempo mínimo de llenado
    if (form.elements._gotcha?.value || Date.now() - formLoadedAt < 3000) {
      showStatus('error', [document.createTextNode('No pudimos validar el envío. Esperá unos segundos e intentá de nuevo.')]);
      return;
    }

    const endpoint = form.dataset.endpoint;
    if (!endpoint) {
      showStatus('info', waFallbackNodes('El envío por formulario se está configurando. Tu consulta no se perdió:'));
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData(form);
      data.append('_subject', `Nueva consulta web: ${data.get('servicio')}`);
      const res = await fetch(endpoint, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        let detail = '';
        try {
          const json = await res.json();
          detail = json?.errors?.map((x) => x.message).join(' ') || '';
        } catch { /* sin detalle */ }
        throw new Error(detail || `HTTP ${res.status}`);
      }
      track('generate_lead', { servicio: data.get('servicio'), canal: 'formulario' });
      successBox?.classList.remove('hidden');
      successBox?.classList.add('flex');
      successBox?.focus();
    } catch (err) {
      console.warn('Error al enviar el formulario:', err);
      showStatus('error', waFallbackNodes('No pudimos enviar tu consulta en este momento.'));
    } finally {
      setSubmitting(false);
    }
  });

  $('#form-whatsapp')?.addEventListener('click', () => {
    track('whatsapp_click', { ubicacion: 'formulario', servicio: form.elements.servicio?.value || '' });
    window.open(waLinkFromForm(), '_blank', 'noopener');
  });

  $('#form-reset')?.addEventListener('click', () => {
    form.reset();
    $$('[aria-invalid]', form).forEach((el) => setFieldError(el, ''));
    statusBox?.classList.add('hidden');
    successBox?.classList.add('hidden');
    successBox?.classList.remove('flex');
    $('#form-name')?.focus();
  });
}
