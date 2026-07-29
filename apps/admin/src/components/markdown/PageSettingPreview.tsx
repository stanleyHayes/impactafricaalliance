import type { MediaAsset } from '@iaa/shared';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Markdown } from './Markdown';

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Editorial preview for a static page record, including its Markdown body. */
export const PageSettingPreview = ({
  values,
}: {
  values: Record<string, unknown>;
}): JSX.Element => {
  const image = (values.heroImage as MediaAsset | undefined)?.url;
  const body = text(values.introBody);

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          position: 'relative',
          minHeight: 300,
          overflow: 'hidden',
          borderRadius: 3,
          bgcolor: 'primary.dark',
          color: 'common.white',
          backgroundImage: image
            ? `linear-gradient(rgba(0,30,20,.78), rgba(0,30,20,.78)), url(${image})`
            : undefined,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          p: { xs: 3, sm: 5 },
        }}
      >
        <Chip label={text(values.pageKey) || 'Page'} size="small" sx={{ mb: 3 }} />
        <Typography variant="overline">{text(values.heroEyebrow)}</Typography>
        <Typography variant="h2" sx={{ mt: 1, color: 'common.white' }}>
          {text(values.heroTitle) || 'Page title'}
        </Typography>
        <Typography sx={{ mt: 2, maxWidth: 620, color: 'rgba(255,255,255,.75)' }}>
          {text(values.heroSubtitle)}
        </Typography>
      </Box>

      <Box>
        {text(values.introEyebrow) && <Typography variant="overline">{text(values.introEyebrow)}</Typography>}
        {text(values.introTitle) && <Typography variant="h3">{text(values.introTitle)}</Typography>}
        {body ? <Markdown>{body}</Markdown> : <Typography color="text.disabled">No Markdown page content yet.</Typography>}
      </Box>

      {text(values.ctaTitle) && (
        <Box sx={{ borderRadius: 3, bgcolor: 'primary.dark', color: 'common.white', p: 4, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ color: 'common.white' }}>{text(values.ctaTitle)}</Typography>
          <Typography sx={{ mt: 1.5, color: 'rgba(255,255,255,.72)' }}>{text(values.ctaBody)}</Typography>
          {text(values.ctaLabel) && <Button variant="contained" color="secondary" sx={{ mt: 2.5 }}>{text(values.ctaLabel)}</Button>}
        </Box>
      )}
    </Stack>
  );
};
