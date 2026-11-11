/**
 * CONTENIDO DEL PORTFOLIO Y LA GALERÍA
 * ------------------------------------
 * Este archivo se lee al ejecutar `npm run build` y genera el HTML de las
 * secciones "Proyectos" y "Galería" (renderizado estático: indexable por Google
 * y funcional sin JavaScript).
 *
 * Regla del spec: cada proyecto publicado debe tener información REAL y VERIFICABLE.
 *
 * Imágenes: colocar los originales en src/images/originales/ y ejecutar
 * `npm run images`, que genera versiones .webp optimizadas en src/images/.
 */

/**
 * @typedef {Object} Proyecto
 * @property {string} id                 Identificador único (sin espacios)
 * @property {string} nombre
 * @property {'software'|'datos'|'web'|'ciberseguridad'} categoria
 * @property {string} descripcion
 * @property {string} problema           Problema que resuelve
 * @property {string[]} tecnologias      Tecnologías utilizadas
 * @property {{src:string, alt:string, ancho:number, alto:number}|null} imagen  Captura de pantalla
 * @property {{url:string, texto:string}|null} enlace  Enlace al proyecto (si existe)
 */

/** @type {Proyecto[]} */
export const proyectos = [
  {
    id: 'impulso-smart',
    nombre: 'Impulso Smart',
    categoria: 'software',
    descripcion: 'Sistema POS web para comercios y negocios: ventas, stock, caja y reportes desde el navegador.',
    problema: 'Muchos comercios registran ventas y stock a mano o en planillas, sin información confiable para decidir.',
    // PENDIENTE: completar con el stack real de Impulso Smart.
    tecnologias: [],
    imagen: {
      src: '/images/proyectos/impulso-smart.svg',
      alt: 'Ilustración de la interfaz de Impulso Smart',
      ancho: 800,
      alto: 560,
    },
    enlace: { url: '#impulso-smart', texto: 'Ver producto' },
  },
  {
    id: 'sitio-corporativo',
    nombre: 'Sitio corporativo Impulso Digital SGO',
    categoria: 'web',
    descripcion: 'Sitio institucional con captación de consultas, SEO técnico, accesibilidad y seguridad de cabeceras.',
    problema: 'La empresa necesitaba una presencia web profesional que genere confianza y convierta visitas en consultas.',
    tecnologias: ['HTML5', 'Tailwind CSS', 'JavaScript', 'Formspree', 'Netlify'],
    imagen: {
      src: '/images/proyectos/sitio-corporativo.webp',
      alt: 'Captura de la portada del sitio de Impulso Digital SGO',
      ancho: 1280,
      alto: 800,
    },
    enlace: null,
  },
];

/**
 * @typedef {Object} ItemGaleria
 * @property {'imagen'|'video'} tipo
 * @property {string} src            Ruta del archivo (ej: /images/galeria/oficina.webp o /videos/demo.mp4)
 * @property {string} [poster]       Imagen de respaldo para videos (obligatoria para videos)
 * @property {string} titulo
 * @property {string} categoria      Texto corto (ej: "Equipo", "Producto")
 * @property {string} alt            Texto alternativo (para imágenes)
 * @property {number} ancho
 * @property {number} alto
 */

/**
 * La sección Galería (y su enlace en el menú) se publica solo si esta lista
 * tiene elementos. Así no hay recursos multimedia rotos.
 * @type {ItemGaleria[]}
 */
export const galeria = [];
