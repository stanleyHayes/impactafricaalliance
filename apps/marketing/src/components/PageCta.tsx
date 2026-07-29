import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import type { PageCopyDefaults } from '../lib/content-hooks';

/** Optional CMS-authored call-to-action band shared by static marketing pages. */
export const PageCta = ({ copy }: { copy: PageCopyDefaults }): JSX.Element | null => {
  if (!copy.ctaTitle) {
    return null;
  }

  return (
    <Box component="section" sx={{ bgcolor: 'primary.dark', color: 'common.white', py: { xs: 7, md: 9 } }}>
      <Container sx={{ textAlign: 'center' }}>
        <Typography variant="h2" sx={{ mx: 'auto', maxWidth: 760, color: 'common.white' }}>
          {copy.ctaTitle}
        </Typography>
        {copy.ctaBody && (
          <Typography sx={{ mx: 'auto', mt: 2, maxWidth: 660, color: 'rgba(255,255,255,0.74)', lineHeight: 1.75 }}>
            {copy.ctaBody}
          </Typography>
        )}
        {copy.ctaLabel && copy.ctaUrl && (
          <Button
            component="a"
            href={copy.ctaUrl}
            variant="contained"
            color="secondary"
            size="large"
            sx={{ mt: 3.5 }}
          >
            {copy.ctaLabel}
          </Button>
        )}
      </Container>
    </Box>
  );
};
