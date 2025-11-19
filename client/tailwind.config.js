/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1434A4',
          50: '#E8EDF9',
          100: '#D1DBF3',
          200: '#A3B7E7',
          300: '#7593DB',
          400: '#476FCF',
          500: '#1434A4',
          600: '#0F2883',
          700: '#0B1E62',
          800: '#071441',
          900: '#030A20',
        },
        secondary: {
          DEFAULT: '#00A3E0',
          50: '#E6F7FD',
          100: '#CCEFFB',
          200: '#99DFF7',
          300: '#66CFF3',
          400: '#33BFEF',
          500: '#00A3E0',
          600: '#0082B3',
          700: '#006186',
          800: '#00415A',
          900: '#00202D',
        },
        success: {
          DEFAULT: '#10B981',
          dark: '#059669',
          light: '#34D399',
        },
        danger: {
          DEFAULT: '#EF4444',
          dark: '#DC2626',
          light: '#F87171',
        },
        warning: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
          light: '#FBBF24',
        },
        neutral: {
          DEFAULT: '#6B7280',
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
    },
  },
  plugins: [],
}
