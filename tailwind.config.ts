import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta EPO 221 · verde agua + blanco dominantes
        verde: { DEFAULT: '#0d9488', medio: '#14b8a6', claro: '#5eead4', oscuro: '#115e59' },
        dorado: { DEFAULT: '#c9a227', claro: '#f0c84a' },
        crema: '#f5fdfb',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
