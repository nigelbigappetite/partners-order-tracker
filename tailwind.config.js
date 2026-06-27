/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '375px',  // iPhone SE, iPhone 8, etc.
        // Default Tailwind breakpoints:
        // sm: 640px
        // md: 768px
        // lg: 1024px
        // xl: 1280px
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Hungry Tum brand colors — sourced from styles/brand-tokens.css
        brand: {
          primary:   'var(--ht-color-primary)',       // #ff8c42
          secondary: 'var(--ht-color-orange-hover)',  // #e67e3b
          accent:    'var(--ht-color-accent)',         // #9b59b6
          light:     'var(--ht-color-off-white)',      // #fdf8f1
          canvas:    'var(--ht-color-canvas)',         // #fdfdf9
          dark:      '#D84315',
          text:      '#2C1810',
          muted:     '#8B6F47',
        },
        // ht.* namespace — use these in new components
        ht: {
          orange:          'var(--ht-color-orange)',        // #ff8c42
          'orange-hover':  'var(--ht-color-orange-hover)', // #e67e3b
          'orange-dark':   'var(--ht-color-orange-hover-dark)', // #ff9f62
          purple:          'var(--ht-color-accent)',        // #9b59b6
          green:           'var(--ht-color-success)',       // #27ae60
          'off-white':     'var(--ht-color-off-white)',     // #fdf8f1
          canvas:          'var(--ht-color-canvas)',        // #fdfdf9
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

