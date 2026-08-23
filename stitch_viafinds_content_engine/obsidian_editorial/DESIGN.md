---
name: Obsidian Editorial
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c5da'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e8fa3'
  outline-variant: '#434657'
  surface-tint: '#b9c3ff'
  primary: '#b9c3ff'
  on-primary: '#00228a'
  primary-container: '#0047ff'
  on-primary-container: '#d4d9ff'
  inverse-primary: '#0046fa'
  secondary: '#ffdb9d'
  on-secondary: '#412d00'
  secondary-container: '#feb700'
  on-secondary-container: '#6b4b00'
  tertiary: '#e9c349'
  on-tertiary: '#3c2f00'
  tertiary-container: '#cba72f'
  on-tertiary-container: '#4e3d00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b9c3ff'
  on-primary-fixed: '#001257'
  on-primary-fixed-variant: '#0033c0'
  secondary-fixed: '#ffdea8'
  secondary-fixed-dim: '#ffba20'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4200'
  tertiary-fixed: '#ffe088'
  tertiary-fixed-dim: '#e9c349'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#574500'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
  obsidian-deep: '#0A0A0A'
  charcoal-surface: '#131313'
  slate-border: '#2E2E2E'
  paper-white: '#F9F9F9'
  deep-navy: '#00113A'
typography:
  headline-xl:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  editorial-body:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 32px
  ui-body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  sidebar-width: 280px
  max-content-width: 1280px
---

## Brand & Style

The design system is an institutional curation platform that merges high-density data management with premium tech-journalism aesthetics. It is designed to evoke a sense of authority, precision, and exclusivity, catering to professional tech researchers and procurement specialists.

The visual direction is **Minimalist / High-Contrast**, leaning heavily into a "Command Center" aesthetic for administrative tasks and a "Premium Publication" layout for public-facing content. The style avoids all personal imagery, focusing instead on structural integrity, generous whitespace, and sharp technical details to reinforce its position as a sophisticated, secure, and institutional tool.

## Colors

The system employs a dual-mode strategy to strictly segregate environments. 

**Admin Command Center (Dark Mode):** Utilizes a base of Obsidian (`#0A0A0A`) for the lowest layer, with Charcoal (`#131313`) used for container surfaces to reduce visual fatigue. Electric Blue is the high-intent primary action color, while Gold/Amber is strictly reserved for financial metrics and "Verified" status badges.

**Public Editorial (Light Mode):** Flips to a Paper White (`#F9F9F9`) background. High-contrast Deep Navy (`#00113A`) or Obsidian text ensures maximum readability. The primary indigo remains for interactive elements to maintain brand continuity.

Zero administrative UI colors or patterns should leak into the public theme; the public pages must feel like a standalone, premium tech publication.

## Typography

Typography is used to distinguish between storytelling and technical utility.

- **Editorial Headlines:** `Playfair Display` provides a high-end, literary feel. It should be used with tight tracking for a sophisticated, "newsprint-luxe" appearance.
- **Long-form Content:** `Inter` is the primary body face, set with a 1.7x line-height (`32px` on `18px` base) to ensure comfort during extended research reading.
- **System Interface:** `Geist` is utilized for the Admin Command Center and all data-heavy components. Its technical, slightly monospaced rhythm reinforces the "data-first" nature of the curation desk.

All labels and status markers use `Geist` in all-caps with increased letter spacing for a disciplined, institutional look.

## Layout & Spacing

The layout philosophy alternates between **Fixed Grid** for editorial clarity and **Fluid Grid** for administrative power.

- **Public Editorial:** A fixed-width, centered 12-column grid. Margins are generous (64px) to create an expensive, airy feel.
- **Admin Command Center:** A fluid layout anchored by a persistent 280px sidebar. Content density is higher here, utilizing an 8px base unit for all component spacing to maximize data visibility.

**Breakpoints:**
- **Mobile (< 768px):** 16px margins; sidebar collapses into a hidden drawer. Content reflows to a single column.
- **Desktop (> 1024px):** Full 12-column grid with 24px gutters. Editorial content is capped at `1280px` to maintain line length legibility.

## Elevation & Depth

This system avoids traditional soft shadows, relying instead on **Tonal Layers** and **Subtle Outlines** to communicate depth.

- **Surface Tiering:** In Dark Mode, elevation is shown by stepping from Obsidian (`#0A0A0A`) to Charcoal (`#131313`).
- **Technical Borders:** 1px solid Slate (`#2E2E2E`) borders are the primary way to define container boundaries, reinforcing a sharp, structural grid.
- **Public Depth:** For the light editorial mode, use an extremely subtle, zero-blur border or a 4% opacity neutral tint to separate cards from the background. 

Avoid any neomorphic or heavy skeuomorphic effects; the depth must remain clinical and professional.

## Shapes

The shape language is "Soft-Sharp." All structural UI elements (inputs, cards, containers) use a disciplined **4px (0.25rem)** corner radius. 

This creates a professional, institutional frame that is slightly more modern than a pure 0px edge but avoids the casual feel of highly rounded systems. Status badges and specialized "EEAT" markers may use pill shapes to distinguish them as floating meta-data rather than structural containers.

## Components

- **Buttons:** Primary buttons are solid Electric Blue with white text and 4px corners. Secondary buttons use a ghost style with a 1px border and no fill.
- **Data Tables:** High-density layouts using `Geist`. Use 0.5px dividers. Hover states trigger a subtle shift to the secondary surface color (`#131313`).
- **Status Badges:** Metrics use the Gold/Amber palette for "Success" or "High Confidence." Institutional "EEAT" badges feature a thin gold border with `label-caps` typography.
- **Input Fields:** Flat, obsidian backgrounds with a 1px slate border. On focus, the border transitions to Electric Blue with no outer glow.
- **Curation Cards:** In editorial views, cards use generous internal padding (32px) and no border, separated only by white space or the thinnest possible horizontal rule.
- **Institutional Guardrails:** No user avatars are permitted. Use monospaced ID strings or generic category icons to maintain an impersonal, objective command center feel.