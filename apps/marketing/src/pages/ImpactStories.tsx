import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { Seo } from '../components/Seo';

/**
 * Published impact stories (`/impact/stories`).
 *
 * A placeholder that holds the route until the impact-stories module replaces
 * it; `noindex` keeps it out of search results in the meantime.
 */
const ImpactStories = (): JSX.Element => (
  <Container component="section" sx={{ py: { xs: 8, md: 12 } }}>
    <Seo title="Impact stories" noindex />
    <Typography variant="h2" component="h1">
      Impact stories
    </Typography>
    <Typography sx={{ mt: 2, maxWidth: 640, color: 'text.secondary', lineHeight: 1.75 }}>
      Stories from our projects will be published here.
    </Typography>
  </Container>
);

export default ImpactStories;
