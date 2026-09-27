import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { Seo } from '../components/Seo';

/**
 * Staff preview of an unpublished impact story (`/impact/stories/preview#<token>`).
 *
 * A placeholder that holds the route until the impact-stories module replaces
 * it. Previews are never indexed, placeholder or not (plan D10).
 */
const ImpactStoryPreview = (): JSX.Element => (
  <Container component="section" sx={{ py: { xs: 8, md: 12 } }}>
    <Seo title="Story preview" noindex />
    <Typography variant="h2" component="h1">
      Story preview
    </Typography>
    <Typography sx={{ mt: 2, maxWidth: 640, color: 'text.secondary', lineHeight: 1.75 }}>
      Story previews open from the admin console.
    </Typography>
  </Container>
);

export default ImpactStoryPreview;
