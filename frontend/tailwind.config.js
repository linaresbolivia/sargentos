/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        glass: {
          bg: 'rgba(8, 22, 14, 0.75)',
          border: 'rgba(204, 161, 75, 0.12)', // gold border
          input: 'rgba(5, 12, 8, 0.6)',
          accent: 'rgba(204, 161, 75, 0.2)', // gold accent
        },
        // Flat colors definition for robust @apply support in Tailwind/PostCSS
        'brand-green-light': '#1d4e34', // Crest Green
        'brand-green': '#0a1d13', // Deep body green
        'brand-green-dark': '#050e09', // Darkest forest green
        'brand-gold-light': '#dfc285',
        'brand-gold': '#cca14b', // Crest Gold
        'brand-gold-dark': '#b08b26',
      },
      fontFamily: {
        sans: ['Helvetica', 'Arial', 'sans-serif'],
        serif: ['Helvetica', 'Arial', 'sans-serif'],
      },
      backdropBlur: {
        glass: '16px',
        heavy: '24px',
      },
      boxShadow: {
        glass: '0 16px 40px 0 rgba(0, 0, 0, 0.75)',
        goldGlow: '0 0 20px rgba(204, 161, 75, 0.25)', // Elegant subtle gold glow
        emeraldGlow: '0 0 20px rgba(29, 78, 52, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.97)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
