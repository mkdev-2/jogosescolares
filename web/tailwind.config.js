/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Lato'", 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ["'Sora'", 'sans-serif'],
        display: ["'Sora'", 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#0f766e',
          foreground: '#ffffff',
        },
        'primary-dark': '#0d9488',
        'footer-bg': '#134e4a',
        'copyright-bg': '#042f2e',
      },
      maxWidth: {
        portal: '80rem',
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
      },
    },
  },
  plugins: [],
}
