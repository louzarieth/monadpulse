/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'deep-bg': '#0e0e10',
        'purple-accent': '#886FFF',
        'purple-hover': '#ae7aff',
        'glow-blue': '#4fc3f7',
        'success-accent': '#66ffcc',
        'muted-text': '#c9c9d1',
      },
      backdropBlur: {
        '8': '8px',
      },
    },
  },
  plugins: [],
};