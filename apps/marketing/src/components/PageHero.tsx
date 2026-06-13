import { brandColors } from '@iaa/shared';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

interface PageHeroProps {
  title: string;
  subtitle?: string;
}

/** Standard inner-page hero on the brand gold→green gradient. */
export const PageHero = ({ title, subtitle }: PageHeroProps): JSX.Element => (
  <Box
    sx={{
      background: `linear-gradient(110deg, ${brandColors.goldAmber} 0%, ${brandColors.forestGreen} 60%)`,
      color: 'common.white',
      py: { xs: 7, md: 10 },
    }}
  >
    <Container>
      <Typography variant="h1" sx={{ fontSize: { xs: '2.25rem', md: '3.25rem' } }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="h6" sx={{ mt: 2, maxWidth: 720, fontWeight: 400, opacity: 0.95 }}>
          {subtitle}
        </Typography>
      )}
    </Container>
  </Box>
);
