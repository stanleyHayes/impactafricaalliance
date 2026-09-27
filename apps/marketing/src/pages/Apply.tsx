import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { Seo } from '../components/Seo';

/**
 * The applicant flow for a published form (`/apply/:slug`).
 *
 * A placeholder that holds the route until the applications module replaces
 * it; `noindex` keeps it out of search results in the meantime. The route sits
 * outside `Layout`, so this page supplies its own `main` landmark.
 */
const Apply = (): JSX.Element => (
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
    <Seo title="Apply" noindex />
    <Stack spacing={2} alignItems="center" sx={{ maxWidth: 560, textAlign: 'center' }}>
      <Typography variant="h2" component="h1">
        Application
      </Typography>
      <Typography sx={{ color: 'text.secondary', lineHeight: 1.75 }}>
        This application form is not available yet.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Back to the homepage
      </Button>
    </Stack>
  </Box>
);

export default Apply;
