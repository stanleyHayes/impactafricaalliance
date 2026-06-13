import { brandColors, brandFonts } from '@iaa/shared';
import { createTheme } from '@mui/material/styles';

/** Admin console theme — shares brand tokens with the marketing site. */
export const theme = createTheme({
  palette: {
    primary: { main: brandColors.forestGreen, light: brandColors.emeraldGreen },
    secondary: { main: brandColors.goldAmber, contrastText: brandColors.charcoalBlack },
    background: { default: '#F4F6F4', paper: brandColors.white },
    text: { primary: brandColors.charcoalBlack },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: brandFonts.body,
    h1: { fontFamily: brandFonts.heading, fontWeight: 700 },
    h2: { fontFamily: brandFonts.heading, fontWeight: 700 },
    h4: { fontFamily: brandFonts.heading, fontWeight: 700 },
    h5: { fontFamily: brandFonts.heading, fontWeight: 600 },
    h6: { fontFamily: brandFonts.heading, fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});
