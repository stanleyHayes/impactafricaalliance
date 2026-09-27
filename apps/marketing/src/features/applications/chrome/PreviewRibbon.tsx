import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/**
 * Pinned above a staff preview so nobody mistakes it for the live form.
 * Nothing in a preview reaches the API: no draft, no upload, no submission.
 */
export const PreviewRibbon = (): JSX.Element => (
  <Stack
    role="note"
    direction="row"
    spacing={1}
    alignItems="center"
    justifyContent="center"
    sx={{
      position: 'sticky',
      top: 0,
      zIndex: (theme) => theme.zIndex.appBar,
      px: 2,
      py: 0.75,
      bgcolor: 'secondary.main',
      color: 'secondary.contrastText',
      textAlign: 'center',
    }}
  >
    <VisibilityRoundedIcon aria-hidden="true" fontSize="small" />
    <Typography sx={{ color: 'inherit', fontWeight: 700, fontSize: '0.9375rem' }}>
      Preview — nothing you enter is sent
    </Typography>
  </Stack>
);
