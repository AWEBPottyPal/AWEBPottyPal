/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eaefff',
          100: '#d9e3ff',
          200: '#b0c7ff',
          300: '#80aaff',
          400: '#4d88ff',
          500: '#2563EB', // Striking primary blue
          main: '#2563EB',
          600: '#1d4ed8',
          700: '#1e3a8a',
          800: '#172554',
          dark: '#0f172a', // Deep navy
          light: '#eff6ff', // Extremely light blue background
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 30px -4px rgba(37, 99, 235, 0.08)',
        'floating': '0 12px 40px -8px rgba(37, 99, 235, 0.15)',
        'premium': '0 0px 40px -10px rgba(0, 0, 0, 0.08)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'float': 'float 4s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
