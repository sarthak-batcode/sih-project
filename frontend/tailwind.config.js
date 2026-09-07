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
        // ---------------------------------------------------------------
        // SURFACES — a blue-biased neutral ramp, not a pure grey.
        // ---------------------------------------------------------------
        ink: {
          0: '#050810',    // page ground
          100: '#0C1220',  // card surface
          200: '#141C2C',  // raised chip
          300: '#1B2536',  // track / well
        },
        line: {
          DEFAULT: '#1E293B',
          strong: '#2E3D53',
        },

        // ---------------------------------------------------------------
        // TEXT — three steps, not five. 100 for values, 200 for anything
        // that forms a sentence (7.9:1 on ink-0), 300 for short mono labels.
        // ---------------------------------------------------------------
        ash: {
          100: '#E6EDF7',
          200: '#A9BAD1',
          300: '#6F819A',
        },

        // ---------------------------------------------------------------
        // ACCENT — interactive only. Nav state, links, focus rings, primary
        // buttons. Never a data series, never a severity.
        // ---------------------------------------------------------------
        accent: {
          DEFAULT: '#2DD4E4',
          soft: 'rgba(45,212,228,0.12)',
          // legacy aliases kept so older markup keeps compiling
          cyan: '#2DD4E4',
          blue: '#3B82F6',
          indigo: '#6366F1',
          purple: '#8B5CF6',
        },

        // ---------------------------------------------------------------
        // SEVERITY — semantic, separate from the accent hue.
        // ---------------------------------------------------------------
        risk: {
          low: '#34D399',
          medium: '#F0B429',
          high: '#FB7185',
          critical: '#FF4D6D',
        },

        // ---------------------------------------------------------------
        // DATA SERIES — neither accent nor severity, so a chart line never
        // reads as "clickable" or as "this is dangerous".
        // ---------------------------------------------------------------
        series: {
          1: '#7C9CF5',
          2: '#8B7BE8',
          3: '#4FB3A5',
        },

        // legacy palette, retained so untouched screens still build
        cyber: {
          950: '#050810',
          900: '#0C1220',
          800: '#141C2C',
          700: '#1E293B',
          600: '#2E3D53',
          500: '#475569',
        },
      },

      fontFamily: {
        // IBM Plex Sans reads better than Inter at the 11–13px sizes this
        // interface lives at, and suits an institutional tool.
        sans: ['IBM Plex Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },

      boxShadow: {
        // Exactly one emphasis shadow, spent on CRITICAL only. The previous
        // four glow variants were applied to every card and badge, which made
        // emphasis universal and therefore meaningless.
        alarm: '0 0 16px -4px rgba(255,77,109,.6)',
        panel: '0 1px 2px rgba(0,0,0,.4)',
        lifted: '0 18px 40px -22px rgba(0,0,0,.9)',
      },
    },
  },
  plugins: [],
}
