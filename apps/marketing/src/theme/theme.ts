import { brandColors, brandFonts } from '@iaa/shared';
import { alpha, createTheme, type ThemeOptions } from '@mui/material/styles';

const lightPalette: ThemeOptions['palette'] = {
  mode: 'light',
  primary: {
    main: brandColors.mint,
    dark: '#00B878',
    light: '#4DE7AD',
    contrastText: brandColors.deepForest,
  },
  secondary: {
    main: brandColors.gold,
    dark: '#D49E00',
    light: '#FFD44D',
    contrastText: brandColors.deepForest,
  },
  success: { main: brandColors.mint },
  background: {
    default: brandColors.sand,
    paper: brandColors.white,
  },
  text: {
    primary: brandColors.charcoalBlack,
    secondary: brandColors.slate,
  },
  common: {
    black: brandColors.deepForest,
    white: brandColors.white,
  },
  divider: brandColors.borderSubtle,
};

const darkPalette: ThemeOptions['palette'] = {
  mode: 'dark',
  primary: {
    main: '#2EE89F',
    dark: '#00D68B',
    light: '#6DF0BC',
    contrastText: brandColors.deepForest,
  },
  secondary: {
    main: '#FFD133',
    dark: brandColors.gold,
    light: '#FFE066',
    contrastText: brandColors.deepForest,
  },
  success: { main: '#2EE89F' },
  background: {
    default: brandColors.darkCanvas,
    paper: brandColors.deepForest,
  },
  text: {
    primary: '#F2F0EA',
    secondary: '#9EAAA4',
  },
  common: {
    black: brandColors.deepForest,
    white: brandColors.white,
  },
  divider: 'rgba(255,255,255,0.10)',
};

const baseOptions = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: mode === 'light' ? lightPalette : darkPalette,
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: brandFonts.body,
    h1: {
      fontFamily: brandFonts.heading,
      fontWeight: 600,
      lineHeight: 1.06,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontFamily: brandFonts.heading,
      fontWeight: 600,
      lineHeight: 1.12,
      letterSpacing: '-0.018em',
    },
    h3: { fontFamily: brandFonts.heading, fontWeight: 600 },
    h4: { fontFamily: brandFonts.heading, fontWeight: 600 },
    h5: { fontFamily: brandFonts.heading, fontWeight: 600 },
    h6: { fontFamily: brandFonts.heading, fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
    body1: { lineHeight: 1.7 },
    subtitle1: { fontWeight: 500 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { scrollBehavior: 'smooth' },
        body: {
          backgroundColor: mode === 'light' ? brandColors.sand : brandColors.darkCanvas,
          backgroundImage:
            mode === 'light'
              ? 'radial-gradient(circle at 8% 4%, rgba(0,214,139,0.04), transparent 24rem)'
              : 'radial-gradient(circle at 90% 0%, rgba(0,214,139,0.06), transparent 30rem)',
        },
        '::selection': {
          backgroundColor: alpha(brandColors.mint, mode === 'light' ? 0.32 : 0.35),
          color: brandColors.deepForest,
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
          fontWeight: 600,
          transition: 'transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease',
          '&:focus-visible': {
            outline: `3px solid ${alpha(brandColors.mint, 0.36)}`,
            outlineOffset: 3,
          },
        },
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            color: brandColors.deepForest,
            boxShadow: '0 12px 28px -18px rgba(0,214,139,0.5)',
            '&:hover': {
              boxShadow: '0 16px 34px -18px rgba(0,214,139,0.6)',
              transform: 'translateY(-1px)',
            },
          },
        },
        {
          props: { variant: 'contained', color: 'secondary' },
          style: {
            color: brandColors.deepForest,
            boxShadow: '0 12px 28px -18px rgba(245,184,0,0.5)',
            '&:hover': {
              boxShadow: '0 16px 34px -18px rgba(245,184,0,0.6)',
              transform: 'translateY(-1px)',
            },
          },
        },
        {
          props: { variant: 'outlined', color: 'primary' },
          style: {
            borderColor: brandColors.mint,
            color: brandColors.mint,
            '&:hover': {
              backgroundColor: alpha(brandColors.mint, 0.08),
            },
          },
        },
        {
          props: { variant: 'outlined', color: 'secondary' },
          style: {
            borderColor: brandColors.gold,
            color: brandColors.gold,
            '&:hover': {
              backgroundColor: alpha(brandColors.gold, 0.08),
            },
          },
        },
        {
          props: { variant: 'text', color: 'primary' },
          style: {
            color: 'text.primary',
          },
        },
      ],
    },
    MuiAppBar: { defaultProps: { color: 'transparent', elevation: 0 } },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${mode === 'light' ? brandColors.borderSubtle : 'rgba(255,255,255,0.10)'}`,
          backgroundColor: mode === 'light' ? brandColors.white : brandColors.deepForest,
        },
      },
    },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiContainer: { defaultProps: { maxWidth: 'lg' } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: mode === 'light' ? brandColors.white : alpha(brandColors.white, 0.04),
          transition: 'box-shadow 180ms ease, background-color 180ms ease',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(brandColors.mint, 0.5),
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(brandColors.mint, 0.15)}`,
          },
        },
        notchedOutline: {
          borderColor: mode === 'light' ? brandColors.borderSubtle : 'rgba(255,255,255,0.14)',
        },
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
          color: 'text.primary',
          textUnderlineOffset: 3,
          transition: 'color 180ms ease',
        },
      },
    },
  },
});

export const createMarketingTheme = (mode: 'light' | 'dark') => createTheme(baseOptions(mode));

/** Default light theme for tests and direct imports. */
export const theme = createMarketingTheme('light');
