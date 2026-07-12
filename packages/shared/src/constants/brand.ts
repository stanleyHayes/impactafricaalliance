/**
 * IAA brand tokens — single source of truth for colours and typography.
 * Refreshed for higher contrast and a cleaner editorial feel:
 *  - Fraunces for display headings
 *  - Outfit for body / UI
 *  - Calmer green/gold accents against warm sand and deep navy/forest surfaces
 */

export const brandColors = {
  // Core identity
  deepForest: '#0E2A22', // authority panels, cards, footer, dark mode paper
  darkCanvas: '#171A17', // dark mode page canvas
  forest: '#0B3D2E', // dark green accents
  mint: '#00D68B', // primary interactive accent (darker than the legacy #00FCAA for AA contrast)
  gold: '#F5B800', // secondary accent / CTAs
  white: '#FFFFFF', // surfaces / inverse text

  // Neutrals
  sand: '#F7F5F0', // page background
  offWhite: '#F7F5F0', // legacy alias
  charcoalBlack: '#0A0F0D', // primary text
  ink: '#0A0F0D', // alias for primary text
  slate: '#5E6B66', // secondary text / muted icons
  borderSubtle: '#E2E0DA', // card borders, hairlines

  // Soft tints
  lightMint: '#E6FAF2',
  lightGold: '#FFF7DB',

  // Gradients
  greenGradientStart: '#0E2A22',
  greenGradientEnd: '#0B3D2E',
  goldGreenGradientStart: '#F5B800',
  goldGreenGradientEnd: '#00D68B',

  // Legacy aliases kept for compatibility
  forestGreen: '#0B3D2E',
  emeraldGreen: '#00D68B',
  goldAmber: '#F5B800',
} as const;

export type BrandColorToken = keyof typeof brandColors;

export const brandFonts = {
  heading: "'Fraunces', Georgia, 'Times New Roman', serif",
  display: "'Fraunces', Georgia, 'Times New Roman', serif",
  body: "'Outfit', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  accent: "'Fraunces', Georgia, 'Times New Roman', serif",
} as const;

export const brandTypography = {
  bodyMinSizeDesktopPx: 16,
  bodyMinSizeMobilePx: 15,
  bodyLineHeight: 1.6,
} as const;

export const brandAssets = {
  logoMinWidthDesktopPx: 120,
  logoMinWidthMobilePx: 90,
} as const;

export const brandGradients = {
  green: `linear-gradient(135deg, ${brandColors.greenGradientStart}, ${brandColors.greenGradientEnd})`,
  goldGreen: `linear-gradient(135deg, ${brandColors.goldGreenGradientStart}, ${brandColors.goldGreenGradientEnd})`,
} as const;
