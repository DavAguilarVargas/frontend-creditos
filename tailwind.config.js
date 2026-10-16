/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          800: '#0f2043',
          900: '#0a152d',
        },
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#1c5aa0',
          600: '#15467e',
          700: '#0f325a',
        }
      }
    },
  },
  plugins: [],
}