import { brandColors, brandFonts } from '@iaa/shared';
import { createTheme, type ThemeOptions } from '@mui/material/styles';

/** MUI theme derived entirely from the IAA brand tokens (@iaa/shared). */
const themeOptions: ThemeOptions = {
  palette: {
    primary: { main: brandColors.forestGreen, dark: '#12422A', light: brandColors.emeraldGreen },
    secondary: { main: brandColors.goldAmber, contrastText: brandColors.charcoalBlack },
    success: { main: brandColors.emeraldGreen },
    background: { default: brandColors.offWhite, paper: brandColors.white },
    text: { primary: brandColors.charcoalBlack, secondary: '#4A4A4A' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: brandFonts.body,
    h1: { fontFamily: brandFonts.heading, fontWeight: 800, lineHeight: 1.1 },
    h2: { fontFamily: brandFonts.heading, fontWeight: 700, lineHeight: 1.15 },
    h3: { fontFamily: brandFonts.heading, fontWeight: 700 },
    h4: { fontFamily: brandFonts.heading, fontWeight: 700 },
    h5: { fontFamily: brandFonts.heading, fontWeight: 600 },
    h6: { fontFamily: brandFonts.heading, fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
    body1: { lineHeight: 1.7 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999, paddingInline: 24, paddingBlock: 10 } },
    },
    MuiAppBar: { defaultProps: { color: 'transparent', elevation: 0 } },
    MuiCard: { styleOverrides: { root: { borderRadius: 16 } } },
    MuiContainer: { defaultProps: { maxWidth: 'lg' } },
  },
};

export const theme = createTheme(themeOptions);
