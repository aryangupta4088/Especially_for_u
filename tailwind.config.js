/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        orchid: '#CDB4DB', petal: '#FFC8DD', blush: '#FFAFCC', icy: '#BDE0FE', sky: '#A2D2FF', ink: '#3B2A4A', muted: '#6B5B7B', paper: '#FFFBFE',
      },
      fontFamily: { display: ['Fraunces', 'serif'], sans: ['DM Sans', 'sans-serif'] },
    },
  },
  plugins: [],
};
