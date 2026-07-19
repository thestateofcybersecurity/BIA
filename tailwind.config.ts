import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f5f2ea',
        surface: '#fdfcf8',
        ink: {
          DEFAULT: '#1b2430',
          soft: '#3d4756',
          muted: '#6b7280',
          faint: '#9aa1ac',
        },
        line: '#e2ddd0',
        accent: {
          DEFAULT: '#bc4a1b',
          soft: '#f4e3d7',
        },
        // Ordinal severity ramp, light -> dark, one hue family.
        s0: '#ece7da',
        s1: '#f2d3ae',
        s2: '#e8a366',
        s3: '#c95f24',
        s4: '#8a2210',
        ok: '#2e6e46',
        warn: '#a06c0a',
        bad: '#a3271c',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(27,36,48,0.05), 0 4px 16px rgba(27,36,48,0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
