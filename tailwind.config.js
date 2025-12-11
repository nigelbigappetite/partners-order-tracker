/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Hungry Tum brand colors
        brand: {
          primary: '#FF6B35',      // Warm orange (appetite/appealing)
          secondary: '#F7931E',     // Golden orange
          accent: '#FF8C42',       // Lighter orange
          dark: '#D84315',         // Deep orange-red
          light: '#FFE5D9',        // Light peach
          text: '#2C1810',        // Warm dark brown
          muted: '#8B6F47',       // Muted brown
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '8px': '8px',
        '16px': '16px',
        '24px': '24px',
        '32px': '32px',
        '40px': '40px',
        '48px': '48px',
      },
    },
  },
  plugins: [],
}

