---
name: Autonomous Operations Interface
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#444655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#757686'
  outline-variant: '#c5c5d7'
  surface-tint: '#374ddb'
  primary: '#0426be'
  on-primary: '#ffffff'
  primary-container: '#2e45d4'
  on-primary-container: '#c5caff'
  inverse-primary: '#bbc3ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#3d4143'
  on-tertiary: '#ffffff'
  tertiary-container: '#55585a'
  on-tertiary-container: '#ccced0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bbc3ff'
  on-primary-fixed: '#000d5f'
  on-primary-fixed-variant: '#1530c4'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: JetBrains Mono
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
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin: 24px
---

## Brand & Style
The design system is engineered for high-performance affiliate marketing automation. The brand personality is **authoritative, precise, and systematic**. It moves away from "consumer-grade" playfulness toward a **Premium AI Operations** aesthetic—evoking the feeling of a mission control center.

The style is rooted in **Modern Corporate Minimalism** with a focus on data density and functional clarity. It utilizes a high-contrast foundation to ensure critical metrics are immediately legible. Visual flourishes are restricted to functional indicators, such as status LEDs and active state highlights, ensuring the user remains focused on operational throughput rather than the interface itself.

## Colors
The palette is dominated by **Slate Blue (Primary)** to establish trust and professional rigor. **Vibrant Teal (Secondary)** is reserved exclusively for AI-driven actions, active automation states, and primary conversion paths.

- **Primary:** Used for main navigation elements, primary buttons, and selected states.
- **Secondary:** Used for AI "thinking" indicators, active automation toggles, and growth metrics.
- **Surface Colors:** A tiered system of light grays (`#F8FAFC`, `#F1F5F9`) to separate dashboard widgets without heavy borders.
- **Status Colors:** Follow a strict functional logic. Emerald for active processes, Amber for pending/warning, Rose for halted/error states, and Slate for disabled/manual modes.

## Typography
This design system utilizes **Inter** for its neutral, highly legible character, making it ideal for complex SaaS interfaces. For technical data, IDs, and financial metrics, **JetBrains Mono** is employed to provide a "developer-grade" precision feel.

- **Headlines:** Use tight letter-spacing for a modern, compact look.
- **Data Display:** Use `mono-data` for table cells containing currency, timestamps, or ID strings to ensure alignment and readability.
- **Labels:** Small-caps are used for table headers and section overviews to create a clear hierarchy between metadata and content.

## Layout & Spacing
The layout follows a **Strict 8px Grid System** (with 4px increments for micro-adjustments). It uses a **Fluid Grid** for the main dashboard content, allowing cards and data tables to expand based on viewport width while maintaining consistent internal gutters.

- **Side Navigation:** 280px width (expanded), 72px (collapsed).
- **Dashboard Margins:** 24px on all sides for desktop views to provide breathing room for complex data.
- **Component Padding:** Buttons and inputs use `8px` vertical and `16px` horizontal padding as the standard.

## Elevation & Depth
To maintain a professional, flat aesthetic, this design system avoids heavy drop shadows. Instead, it utilizes **Tonal Layers** and **Low-Contrast Outlines**.

- **Level 0 (Background):** `#F8FAFC` (Slate 50).
- **Level 1 (Cards/Tables):** White background with a 1px border in `#E2E8F0`.
- **Level 2 (Dropdowns/Modals):** Subtle 1px border with a soft, highly diffused ambient shadow (`0 10px 15px -3px rgba(0,0,0,0.05)`).
- **Focus States:** 2px solid ring using the Secondary Teal color to indicate active keyboard or mouse focus.

## Shapes
The shape language is **Soft yet Structured**. A `0.25rem (4px)` radius is the standard for most functional elements (inputs, buttons, cards) to maintain a crisp, professional edge. Larger containers like Modals use `0.5rem (8px)` to distinguish them from the base layout.

## Components
Consistent implementation of the following components is required to maintain the "AI OS" aesthetic:

- **Action Buttons:** 
    - **RUN:** Solid Success Green (`#10B981`) with white text.
    - **STOP:** Outlined Rose or Solid Amber for caution.
- **Toggle Switches:** Custom "Industrial" style. When ON, the track should be Primary Blue or Secondary Teal. When OFF, it must be Slate Gray. 
- **Status LEDs:** Small 8x8px circular indicators placed next to text. They should have a subtle glow effect (`box-shadow`) when the status is "Active."
- **Data Tables:** Border-collapsed style. Headers use `label-caps` typography with a light gray background. Row hover state should use a very subtle blue tint (`#F1F5F9`).
- **Command Input:** A specialized global search/command bar at the top of the UI, featuring a "K" shortcut hint and a monospaced font for typed queries.
- **Cards:** No shadows; use 1px borders. Titles should be `headline` size with a 16px bottom margin to the content.