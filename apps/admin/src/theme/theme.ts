import { brandColors, brandFonts } from '@iaa/shared';
import { alpha, createTheme } from '@mui/material/styles';

/** Admin console theme — shares brand tokens with the marketing site. */
export const theme = createTheme({
  palette: {
    primary: {
      main: brandColors.forestGreen,
      dark: '#123F29',
      light: brandColors.emeraldGreen,
    },
    secondary: { main: brandColors.goldAmber, contrastText: brandColors.charcoalBlack },
    background: { default: '#F3F6F3', paper: brandColors.white },
    text: { primary: brandColors.charcoalBlack, secondary: '#5F6B63' },
    divider: 'rgba(26,92,56,0.12)',
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: brandFonts.body,
    h1: { fontFamily: brandFonts.heading, fontWeight: 750, letterSpacing: '-0.02em' },
    h2: { fontFamily: brandFonts.heading, fontWeight: 750, letterSpacing: '-0.018em' },
    h3: { fontFamily: brandFonts.heading, fontWeight: 700, letterSpacing: '-0.015em' },
    h4: { fontFamily: brandFonts.heading, fontWeight: 700, letterSpacing: '-0.012em' },
    h5: { fontFamily: brandFonts.heading, fontWeight: 600 },
    h6: { fontFamily: brandFonts.heading, fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F3F6F3',
          backgroundImage:
            'radial-gradient(circle at 90% 0%, rgba(26,92,56,0.045), transparent 30rem)',
        },
        '::selection': {
          backgroundColor: 'rgba(212,160,23,0.28)',
          color: brandColors.charcoalBlack,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 9,
          paddingInline: 18,
          transition: 'transform 160ms ease, box-shadow 160ms ease',
          '&:focus-visible': {
            outline: `3px solid ${alpha(brandColors.goldAmber, 0.32)}`,
            outlineOffset: 2,
          },
        },
        containedPrimary: {
          boxShadow: '0 10px 24px -16px rgba(18,63,41,0.8)',
          '&:hover': {
            boxShadow: '0 14px 28px -16px rgba(18,63,41,0.9)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${alpha(brandColors.forestGreen, 0.11)}`,
          borderRadius: 14,
        },
      },
    },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: `1px solid ${alpha(brandColors.forestGreen, 0.12)}`,
          borderRadius: 16,
          boxShadow: '0 32px 80px -40px rgba(15,45,29,0.7)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { padding: '24px 28px 18px' } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { paddingInline: 28 } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { gap: 8, padding: '16px 28px 20px' } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: brandColors.white,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(brandColors.forestGreen, 0.5),
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(brandColors.forestGreen, 0.09)}`,
          },
        },
        notchedOutline: { borderColor: alpha(brandColors.forestGreen, 0.2) },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { borderRadius: 7, fontSize: '0.75rem' } },
    },
  },
});
