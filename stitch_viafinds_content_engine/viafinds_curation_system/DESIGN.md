---
name: Viafinds Curation System
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
  secondary: '#e9c349'
  on-secondary: '#3c2f00'
  secondary-container: '#af8d11'
  on-secondary-container: '#342800'
  tertiary: '#ffb4a2'
  on-tertiary: '#621100'
  tertiary-container: '#b82800'
  on-tertiary-container: '#ffd1c6'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b9c3ff'
  on-primary-fixed: '#001257'
  on-primary-fixed-variant: '#0033c0'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#ffdad2'
  tertiary-fixed-dim: '#ffb4a2'
  on-tertiary-fixed: '#3d0700'
  on-tertiary-fixed-variant: '#8a1c00'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
  obsidian: '#0A0A0A'
  charcoal: '#1A1A1A'
  electric-indigo: '#0047FF'
  gold-leaf: '#D4AF37'
  deep-navy: '#00113A'
  paper-white: '#F9F9F9'
  slate-border: '#2E2E2E'
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
    fontFamily: Geist
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

The design system is built for an institutional software discovery platform, emphasizing a "Curation Desk" persona. The aesthetic is high-end editorial minimalism—a fusion of rigorous data structure and premium publishing standards. The target audience includes enterprise procurement officers and technology researchers who require clarity, trust, and professional efficiency.

The visual language follows a **Minimalist** approach with a **Corporate/Modern** backbone. It relies on heavy whitespace, precise typography, and a disciplined color palette to convey authority. While the Admin interface is rooted in a sleek obsidian environment to reduce eye strain during deep work, the Public Blog utilizes a high-contrast editorial layout to prioritize readability and intellectual credibility.

## Colors

This design system utilizes a dual-theming strategy. The default **Admin Control Center** state is "Obsidian Dark," using `#0A0A0A` as the primary surface and `#1A1A1A` for secondary containers. This provides a deep, non-distracting canvas for high-density data.

The **Primary Accent** is an electric indigo (`#0047FF`), used sparingly for high-intent actions and progress indicators. The **Secondary Accent** is a refined gold (`#D4AF37`), reserved for E-E-A-T badges and "Verified Curation" status to signify premium quality. 

The **Public Blog** utilizes the "Paper" mode, flipping the palette to a `#F9F9F9` background with deep charcoal text to maintain the editorial tech aesthetic.

## Typography

The typography strategy separates **Editorial Intent** from **Functional UI**. 

- **Playfair Display** is used for headlines and featured pull-quotes, providing a "high-end journal" feel. It should be used with tight letter-spacing in larger sizes.
- **Inter** serves as the primary reading font for long-form content, optimized for legibility with a generous line height.
- **Geist** is the functional workhorse for the Control Center. Its technical, slightly monospaced character reinforces the "structured data" narrative and is ideal for data tables, sidebars, and labels.

## Layout & Spacing

The system uses a **Fixed Grid** for the Public Blog to maintain editorial focus and a **Fluid Grid** for the Admin Control Center to maximize workspace utility. 

- **Desktop:** 12-column grid with 24px gutters. The Admin panel utilizes a persistent 280px left sidebar for navigation.
- **Content Density:** In the Control Center, use tight vertical spacing for data rows (40px height) but maintain generous margins (64px) for editorial pages.
- **Responsive:** On mobile, margins shrink to 16px, and sidebars transition to a full-screen drawer. Data tables should allow horizontal scrolling or collapse into card-based views.

## Elevation & Depth

Depth is achieved through **Tonal Layering** rather than traditional shadows. In Dark Mode, higher elevation is signified by lighter shades of charcoal (moving from `#0A0A0A` to `#1A1A1A`). 

**Low-contrast outlines** (`1px solid #2E2E2E`) are the primary method for defining card boundaries and input fields. This keeps the UI looking "sharp" and technical. For the Public Blog, use extremely subtle, diffused shadows (0% blur, 4% opacity) to lift article cards off the background without creating visual clutter.

## Shapes

The shape language is disciplined and "Soft-Sharp." Most UI components use a 4px (`0.25rem`) corner radius. This provides just enough approachable warmth to prevent the UI from feeling aggressive, while maintaining the professional structure of an institutional tool. Status badges and tags may use a slightly more rounded 8px radius to distinguish them from structural layout elements.

## Components

- **Buttons:** Primary CTAs are high-contrast (Electric Indigo on Dark, Deep Navy on Light) with sharp corners. Secondary buttons use ghost styling (thin border, no fill).
- **Data Tables:** Use `Geist` for row content. Apply a subtle background change (`#1A1A1A`) on hover. Row borders should be 0.5px or the thinnest possible stroke.
- **Status Badges:** 
    - *Confidence Score:* Circular gauge icon with a numerical value.
    - *E-E-A-T:* Use Gold-Leaf (`#D4AF37`) for text and border to denote authority.
- **Sidebar Navigation:** Use a vertical list with active states indicated by a subtle left-aligned indigo bar and increased font weight.
- **Input Fields:** Flat styling with a 1px border. Focus state is a crisp Indigo border—no outer glow or shadow.
- **Progress Steps:** Use a minimalist thin line with small 8px dots; completed steps turn Indigo, active steps pulse subtly.