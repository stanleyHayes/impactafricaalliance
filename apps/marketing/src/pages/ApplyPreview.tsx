import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Seo } from '../components/Seo';

/**
 * Staff preview of a form's applicant flow (`/apply/preview#<token>`).
 *
 * A placeholder that holds the route until the applications module replaces
 * it. Previews are never indexed, placeholder or not (plan D10). The route
 * sits outside `Layout`, so this page supplies its own `main` landmark.
 */
const ApplyPreview = (): JSX.Element => (
  <Box
    component="main"
    sx={{
      display: 'grid',
      minHeight: '100vh',
      placeItems: 'center',
      px: 2,
      py: 8,
      bgcolor: 'background.default',
    }}
  >
    <Seo title="Form preview" noindex />
    <Stack spacing={2} alignItems="center" sx={{ maxWidth: 560, textAlign: 'center' }}>
      <Typography variant="h2" component="h1">
        Form preview
      </Typography>
      <Typography sx={{ color: 'text.secondary', lineHeight: 1.75 }}>
        Form previews open from the admin console.
      </Typography>
    </Stack>
  </Box>
);

export default ApplyPreview;
