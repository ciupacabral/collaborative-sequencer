/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0f0f0f',
        panel:   '#1a1a1a',
        border:  '#2a2a2a',
        accent:  '#7c3aed',
      },
    },
  },
  plugins: [],
}
