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
 * @property {'cubrir'|'contener'} [encuadre]  'contener' muestra la imagen entera (ideal para logos)
 */

/**
 * La sección Galería (y su enlace en el menú) se publica solo si esta lista
 * tiene elementos. Así no hay recursos multimedia rotos.
 * @type {ItemGaleria[]}
 */
export const galeria = [
  {
    tipo: 'imagen',
    src: '/images/galeria/sumay-producciones.webp',
    titulo: 'Sumay Producciones',
    categoria: 'Identidad de marca',
    alt: 'Logo de Sumay Producciones: un botón de reproducción negro con la palabra Sumay sobre un escenario iluminado',
    ancho: 1080,
    alto: 1080,
    encuadre: 'contener',
  },
  {
    tipo: 'imagen',
    src: '/images/galeria/raices-americanas.webp',
    titulo: 'Raíces Americanas',
    categoria: 'Identidad de marca',
    alt: 'Logo de Raíces Americanas: una pareja bailando dibujada con líneas naranjas y azules sobre fondo negro',
    ancho: 1024,
    alto: 1024,
    encuadre: 'contener',
  },
  {
    tipo: 'imagen',
    src: '/images/galeria/dulce-tonocote.webp',
    titulo: 'Dulce Tonocote',
    categoria: 'Identidad de marca',
    alt: 'Logo de Dulce Tonocote, quinotos hechos en Santiago del Estero: un búho ilustrado con motivos tradicionales y una cinta con el nombre',
    ancho: 1500,
    alto: 1500,
    encuadre: 'contener',
  },
  {
    tipo: 'imagen',
    src: '/images/galeria/miniarte.webp',
    titulo: 'Miniarte',
    categoria: 'Identidad de marca',
    alt: 'Tarjeta de Miniarte, artesanías y muralismo: un gato ilustrado sobre una paleta con pinceles en fondo oscuro',
    ancho: 720,
    alto: 1280,
  },
  {
    tipo: 'imagen',
    src: '/images/galeria/cadeteria-city.webp',
    titulo: 'Cadetería City',
    categoria: 'Redes sociales',
    alt: 'Flyer de Cadetería City: un repartidor en moto con el texto “La solución perfecta para tus envíos urgentes”',
    ancho: 720,
    alto: 1280,
  },
  {
    tipo: 'imagen',
    src: '/images/galeria/gabito.webp',
    titulo: 'Gabito',
    categoria: 'Publicidad',
    alt: 'Flyer de menú de Gabito con empanadas, milanesas y tortillas, con sus precios y entrega por Cadetería City',
    ancho: 1102,
    alto: 1443,
  },
  {
    tipo: 'imagen',
    src: '/images/galeria/tapiceria-rene.webp',
    titulo: 'Tapicería René',
    categoria: 'Publicidad',
    alt: 'Flyer de Tapicería René: un sillón azul retapizado con el lema “Tu mueble, renovado y con tu estilo”',
    ancho: 736,
    alto: 1312,
  },
  {
    tipo: 'imagen',
    src: '/images/galeria/ideograf.webp',
    titulo: 'Ideograf',
    categoria: 'Publicidad',
    alt: 'Flyer de Ideograf: un celular mostrando una tienda online con el texto “Vendé más y mejor con promociones desde tu celular”',
    ancho: 736,
    alto: 1312,
  },
  {
    tipo: 'imagen',
    src: '/images/galeria/sentipensante.webp',
    titulo: 'Sentipensante',
    categoria: 'Redes sociales',
    alt: 'Publicación de carrusel de Instagram para Sentipensante, psicología online, con la frase “Priorizar tu bienestar mental no es un lujo, es una necesidad”',
    ancho: 1080,
    alto: 1350,
  },
  {
    tipo: 'imagen',
    src: '/images/galeria/taller-educacion-financiera.webp',
    titulo: 'Charla de educación financiera',
    categoria: 'Eventos',
    alt: 'Flyer de la charla taller “Aprende a manejar tu dinero”, con foto del conferencista, fecha, horario y código QR',
    ancho: 781,
    alto: 1043,
  },
  {
    tipo: 'imagen',
    src: '/images/galeria/aero-gym-kickboxing.webp',
    titulo: 'Aero Gym',
    categoria: 'Publicidad',
    alt: 'Flyer de clases de kickboxing en Aero Gym, con la silueta de un luchador y el texto “Primera clase gratis”',
    ancho: 297,
    alto: 418,
  },
  {
    tipo: 'imagen',
    src: '/images/galeria/granja-de-la-abuelita.webp',
    titulo: 'La Granja de la Abuelita',
    categoria: 'Publicidad',
    alt: 'Flyer de ofertas de La Granja de la Abuelita con precios de pollo y la lista de sucursales',
    ancho: 1068,
    alto: 2046,
  },
];
