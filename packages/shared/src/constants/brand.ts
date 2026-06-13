/**
 * IAA brand tokens — single source of truth for colours and typography.
 * Mirrors §2 of docs/website-specification.md. Front-ends build their MUI
 * theme from these values so design and code never drift.
 */

export const brandColors = {
  forestGreen: '#1A5C38', // Primary — headers, nav, primary CTAs
  emeraldGreen: '#2E7D4F', // Secondary — hover, sub-sections, icon fills
  goldAmber: '#D4A017', // Accent — highlights, CTA borders
  offWhite: '#F7F7F2', // Page & card backgrounds
  charcoalBlack: '#1A1A1A', // Body text, footer
  white: '#FFFFFF', // Overlays, reversed text
  lightGreen: '#E8F5EE', // Pillar card backgrounds
} as const;

export type BrandColorToken = keyof typeof brandColors;

export const brandFonts = {
  heading: "'Montserrat', 'Poppins', system-ui, sans-serif",
  body: "'Inter', 'Open Sans', system-ui, sans-serif",
  accent: "'Playfair Display', 'Lora', Georgia, serif",
} as const;

export const brandTypography = {
  bodyMinSizeDesktopPx: 16,
  bodyMinSizeMobilePx: 15,
  bodyLineHeight: 1.7,
} as const;

export const brandAssets = {
  logoMinWidthDesktopPx: 120,
  logoMinWidthMobilePx: 90,
} as const;
