/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#12151B',
          600: '#4B5160',
          300: '#9BA0AC',
        },
        line: {
          200: '#DFE1DA',
          100: '#ECEDE8',
        },
        surface: {
          0: '#F4F5F1',
          1: '#FFFFFF',
        },
        navy: {
          900: '#0E2340',
          700: '#16335A',
          100: '#E8EDF4',
        },
        alert: { 600: '#C81E1E' },
        go:    { 600: '#1B7A4B' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
