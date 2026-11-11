/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js}', './build.mjs'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#05070F',      // Fondo negro espacial ultra oscuro
          card: '#0D1121',    // Fondo de tarjeta azul oscuro profundo
          border: '#1E2950',  // Borde azul oscuro de neón sutil
          primary: '#2563EB', // Azul clásico del logo
          cyan: '#06B6D4',    // Cyan vibrante para acentos
          violet: '#818CF8',  // Violeta eléctrico (aclarado para contraste AA sobre fondo oscuro)
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
