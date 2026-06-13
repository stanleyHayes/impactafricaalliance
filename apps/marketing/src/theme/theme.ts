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
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: brandFonts.body,
    h1: {
      fontFamily: brandFonts.heading,
      fontWeight: 800,
      lineHeight: 1.06,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontFamily: brandFonts.heading,
      fontWeight: 700,
      lineHeight: 1.12,
      letterSpacing: '-0.018em',
    },
    h3: { fontFamily: brandFonts.heading, fontWeight: 700 },
    h4: { fontFamily: brandFonts.heading, fontWeight: 700 },
    h5: { fontFamily: brandFonts.heading, fontWeight: 600 },
    h6: { fontFamily: brandFonts.heading, fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
    body1: { lineHeight: 1.7 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { scrollBehavior: 'smooth' },
        body: {
          backgroundColor: brandColors.offWhite,
          backgroundImage:
            'radial-gradient(circle at 8% 4%, rgba(26,92,56,0.035), transparent 24rem)',
        },
        '::selection': {
          backgroundColor: 'rgba(212,160,23,0.32)',
          color: brandColors.charcoalBlack,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 44,
          borderRadius: 999,
          paddingInline: 24,
          paddingBlock: 10,
          transition: 'transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease',
          '&:focus-visible': {
            outline: '3px solid rgba(212,160,23,0.36)',
            outlineOffset: 3,
          },
        },
        containedPrimary: {
          boxShadow: '0 12px 28px -18px rgba(18,66,42,0.8)',
          '&:hover': {
            boxShadow: '0 16px 34px -18px rgba(18,66,42,0.9)',
            transform: 'translateY(-1px)',
          },
        },
        containedSecondary: {
          boxShadow: '0 12px 28px -18px rgba(89,65,4,0.7)',
          '&:hover': {
            boxShadow: '0 16px 34px -18px rgba(89,65,4,0.8)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiAppBar: { defaultProps: { color: 'transparent', elevation: 0 } },
    // Flat surfaces everywhere — no resting drop shadow on cards or paper.
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { borderRadius: 16 } },
    },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiContainer: { defaultProps: { maxWidth: 'lg' } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: brandColors.white,
          transition: 'box-shadow 180ms ease, background-color 180ms ease',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(26,92,56,0.5)',
          },
          '&.Mui-focused': {
            boxShadow: '0 0 0 3px rgba(26,92,56,0.1)',
          },
        },
        notchedOutline: { borderColor: 'rgba(26,92,56,0.2)' },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 48,
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 700,
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          textUnderlineOffset: 3,
          transition: 'color 180ms ease',
        },
      },
    },
  },
};

export const theme = createTheme(themeOptions);
