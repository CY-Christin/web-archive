const typography = require('@tailwindcss/typography')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.tsx', '../shared/components/*.tsx', '../../node_modules/emblor/dist/*.js'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      screens: {
        // Design's desktop breakpoint; mobile is `max-width: 859px`.
        // Use `desk:` for >=860px and `max-desk:` for <=859px.
        desk: '860px',
      },
      colors: {
        'border': 'hsl(var(--border))',
        'input': 'hsl(var(--input))',
        'ring': 'hsl(var(--ring))',
        'background': 'hsl(var(--background))',
        'foreground': 'hsl(var(--foreground))',
        'primary': {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'var(--accent-hover)',
        },
        'secondary': {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        'destructive': {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        'muted': {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        'accent': {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          soft: 'var(--accent-soft)',
        },
        'popover': {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        'card': {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // design tokens (plain color vars from global.css)
        'surface': {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },
        'sidebar': 'var(--sidebar-bg)',
        'border-strong': 'var(--border-strong)',
        'faint': 'var(--text-faint)',
        'danger': {
          DEFAULT: 'var(--danger)',
          soft: 'var(--danger-soft)',
        },
        'success': 'var(--success)',
        'chart': {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
        },
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: 'calc(var(--radius) - 4px)',
        // design radius scale
        card: '16px',
        result: '14px',
        field: '11px',
        btn: '10px',
        iconbtn: '8px',
      },
      fontFamily: {
        sans: ['"Manrope Variable"', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Manrope Variable"', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 2px 0 rgb(16 20 34 / 0.04), 0 1px 3px 0 rgb(16 20 34 / 0.03)',
        'card-hover': '0 2px 4px -1px rgb(16 20 34 / 0.06), 0 8px 20px -4px rgb(16 20 34 / 0.08)',
        'elevated': '0 4px 8px -2px rgb(16 20 34 / 0.06), 0 16px 32px -6px rgb(16 20 34 / 0.12)',
        // design tokens: card hover lift + input focus ring
        'lift': 'var(--shadow)',
        'focus-ring': '0 0 0 3px var(--accent-soft)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        // fadeUp/spin keyframes live in shared/global.css
        'fade-up': 'fadeUp 0.4s ease both',
        'fade-up-fast': 'fadeUp 0.18s ease both',
        'spin-fast': 'spin 0.8s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/line-clamp'), typography],
}
