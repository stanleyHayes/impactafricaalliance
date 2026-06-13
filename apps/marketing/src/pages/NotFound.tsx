import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { Seo } from '../components/Seo';

const NotFound = (): JSX.Element => (
  <Container sx={{ py: { xs: 10, md: 16 }, textAlign: 'center' }}>
    <Seo title="Page Not Found" />
    <Stack spacing={2} alignItems="center">
      <Typography variant="h1" sx={{ fontSize: '5rem', color: 'primary.main' }}>
        404
      </Typography>
      <Typography variant="h5">We couldn&apos;t find that page.</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 480 }}>
        The page you&apos;re looking for may have moved. Let&apos;s get you back to the movement.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained" size="large">
        Back to Home
      </Button>
    </Stack>
  </Container>
);

export default NotFound;
