import { brandColors } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { MintSurface } from '../components/MintSurface';
import { Seo } from '../components/Seo';

const NotFound = (): JSX.Element => (
  <MintSurface
    component="section"
    sx={{
      position: 'relative',
      display: 'grid',
      minHeight: { xs: 600, md: 680 },
      placeItems: 'center',
      overflow: 'hidden',
      '&::before': {
        position: 'absolute',
        top: -240,
        right: -180,
        width: 560,
        height: 560,
        border: `1px solid ${alpha(brandColors.gold, 0.18)}`,
        borderRadius: '50%',
        boxShadow: `0 0 0 70px ${alpha(brandColors.gold, 0.025)}, 0 0 0 140px ${alpha(brandColors.gold, 0.015)}`,
        content: '""',
      },
    }}
  >
    <Seo title="Page Not Found" />
    <Container sx={{ position: 'relative', py: 10 }}>
      <Stack spacing={2.5} alignItems="center" sx={{ textAlign: 'center' }}>
        <Box
          className="mint-glass"
          sx={{
            display: 'grid',
            width: 72,
            height: 72,
            placeItems: 'center',
            borderRadius: '50%',
          }}
        >
          <ExploreRoundedIcon sx={{ fontSize: 34 }} />
        </Box>
        <Typography
          aria-hidden
          sx={{
            color: 'common.black',
            fontSize: { xs: '4.5rem', md: '7rem' },
            fontWeight: 800,
            letterSpacing: '-0.05em',
            lineHeight: 0.9,
          }}
        >
          404
        </Typography>
        <Typography
          variant="h2"
          sx={{ fontSize: { xs: '2rem', md: '2.8rem' } }}
        >
          This path doesn&apos;t lead anywhere yet.
        </Typography>
        <Typography sx={{ maxWidth: 560, color: 'rgba(14,42,34,0.72)', lineHeight: 1.75 }}>
          The page may have moved or the link may be out of date. Head home and keep exploring the
          work happening across the Alliance.
        </Typography>
        <Button
          component={RouterLink}
          to="/"
          variant="contained"
          color="secondary"
          size="large"
          startIcon={<ArrowBackRoundedIcon />}
          sx={{ mt: 1 }}
        >
          Back to Home
        </Button>
      </Stack>
    </Container>
  </MintSurface>
);

export default NotFound;
