import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "inverse-on-surface": "#313030",
        "on-secondary": "#3c2f00",
        "secondary-fixed-dim": "#e9c349",
        "background": "#131313",
        "secondary-fixed": "#ffe088",
        "paper-white": "#F9F9F9",
        "on-surface": "#e5e2e1",
        "tertiary-container": "#b82800",
        "on-tertiary-fixed": "#3d0700",
        "surface-container-lowest": "#0e0e0e",
        "surface-container-high": "#2a2a2a",
        "outline-variant": "#434657",
        "on-tertiary-container": "#ffd1c6",
        "primary": "#b9c3ff",
        "on-secondary-container": "#342800",
        "secondary": "#e9c349",
        "electric-indigo": "#0047FF",
        "secondary-container": "#af8d11",
        "deep-navy": "#00113A",
        "surface-tint": "#b9c3ff",
        "on-tertiary": "#621100",
        "on-secondary-fixed-variant": "#574500",
        "tertiary-fixed-dim": "#ffb4a2",
        "primary-fixed-dim": "#b9c3ff",
        "primary-container": "#0047ff",
        "charcoal": "#1A1A1A",
        "surface": "#131313",
        "slate-border": "#2E2E2E",
        "on-error-container": "#ffdad6",
        "on-primary-container": "#d4d9ff",
        "primary-fixed": "#dde1ff",
        "on-background": "#e5e2e1",
        "on-primary-fixed": "#001257",
        "on-error": "#690005",
        "surface-bright": "#3a3939",
        "inverse-primary": "#0046fa",
        "tertiary": "#ffb4a2",
        "surface-dim": "#131313",
        "error-container": "#93000a",
        "on-primary-fixed-variant": "#0033c0",
        "surface-container": "#201f1f",
        "error": "#ffb4ab",
        "on-primary": "#00228a",
        "gold-leaf": "#D4AF37",
        "surface-container-low": "#1c1b1b",
        "outline": "#8e8fa3",
        "tertiary-fixed": "#ffdad2",
        "obsidian": "#0A0A0A",
        "on-secondary-fixed": "#241a00",
        "on-tertiary-fixed-variant": "#8a1c00",
        "surface-container-highest": "#353534",
        "inverse-surface": "#e5e2e1",
        "on-surface-variant": "#c4c5da",
        "surface-variant": "#353534"
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      spacing: {
        "margin-desktop": "64px",
        "max-content-width": "1280px",
        "gutter": "24px",
        "margin-mobile": "16px",
        "sidebar-width": "280px",
        "base": "8px"
      },
      fontFamily: {
        "mono-data": ["Geist", "sans-serif"],
        "headline-xl": ["Playfair Display", "serif"],
        "headline-lg": ["Playfair Display", "serif"],
        "label-caps": ["Geist", "sans-serif"],
        "headline-lg-mobile": ["Playfair Display", "serif"],
        "editorial-body": ["Inter", "sans-serif"],
        "ui-body": ["Geist", "sans-serif"]
      },
      fontSize: {
        "mono-data": ["13px", { "lineHeight": "18px", "fontWeight": "500" }],
        "headline-xl": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "headline-lg": ["32px", { "lineHeight": "40px", "fontWeight": "600" }],
        "label-caps": ["12px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600" }],
        "headline-lg-mobile": ["28px", { "lineHeight": "36px", "fontWeight": "600" }],
        "editorial-body": ["18px", { "lineHeight": "32px", "fontWeight": "400" }],
        "ui-body": ["14px", { "lineHeight": "20px", "fontWeight": "400" }]
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
};

export default config;
