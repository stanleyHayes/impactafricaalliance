import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { Seo } from '../components/Seo';

/**
 * One published impact story (`/impact/stories/:slug`).
 *
 * A placeholder that holds the route until the impact-stories module replaces
 * it; `noindex` keeps it out of search results in the meantime.
 */
const ImpactStory = (): JSX.Element => (
  <Container component="section" sx={{ py: { xs: 8, md: 12 } }}>
    <Seo title="Impact story" noindex />
    <Typography variant="h2" component="h1">
      Impact story
    </Typography>
    <Typography sx={{ mt: 2, maxWidth: 640, color: 'text.secondary', lineHeight: 1.75 }}>
      This story is not available yet.
    </Typography>
    <Button component={RouterLink} to="/impact" variant="contained" sx={{ mt: 4 }}>
      See our impact
    </Button>
  </Container>
);

export default ImpactStory;
