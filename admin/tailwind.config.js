/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'civic-green': {
          50: '#ECFAE5',
          100: '#DDF6D2',
          200: '#CAE8BD',
          300: '#B0DB9C',
          400: '#95CE7F',
          500: '#7AC162',
          600: '#5FA045',
          700: '#4A7D35',
          800: '#3A5F2A',
          900: '#2D4A20',
        }
      },
      gridTemplateColumns: {
        '20': 'repeat(20, minmax(0, 1fr))',
      },
      gridTemplateRows: {
        '20': 'repeat(20, minmax(0, 1fr))',
      }
    },
  },
  plugins: [],
};
