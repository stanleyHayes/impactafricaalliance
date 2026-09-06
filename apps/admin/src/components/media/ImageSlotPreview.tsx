import type { MediaAsset } from '@iaa/shared';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://www.impactafricaalliance.org').replace(
  /\/$/,
  '',
);

interface ImageSlotPreviewProps {
  /** What this picture is, e.g. "Home hero". */
  title: string;
  /** Where it appears, in an editor's words. */
  usage: string;
  /** The shape the site crops to, e.g. "21 / 9". */
  aspect: string;
  image?: MediaAsset;
  /** The image shipped with the build, shown when nothing is uploaded. */
  fallback?: string;
  /** Path on the public site where the result can be seen. */
  previewPath?: string;
  /** False when the slot is switched off, so the built-in image is used. */
  isActive?: boolean;
}

/**
 * Shows what is about to change, before it changes.
 *
 * A form of file inputs tells an editor which field they are filling in; it
 * does not tell them which picture on which page they are about to replace.
 * This renders the chosen image in the shape the site actually crops it to,
 * next to a plain description of where it appears.
 */
export const ImageSlotPreview = ({
  title,
  usage,
  aspect,
  image,
  fallback,
  previewPath,
  isActive = true,
}: ImageSlotPreviewProps): JSX.Element => {
  const source = image?.url ?? (fallback ? `${SITE_URL}${fallback}` : undefined);
  const usingFallback = !image?.url && Boolean(fallback);

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography sx={{ fontWeight: 750 }}>{title}</Typography>
        <Chip size="small" label={aspect.replace(/\s/g, '')} variant="outlined" />
        {!isActive && <Chip size="small" color="warning" label="Switched off" />}
        {previewPath && (
          <Link
            href={`${SITE_URL}${previewPath}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="caption"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
          >
            See it on the site <OpenInNewIcon sx={{ fontSize: 13 }} />
          </Link>
        )}
      </Stack>

      <Typography variant="body2" color="text.secondary">
        {usage}
      </Typography>

      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: aspect,
          borderRadius: 2,
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {source ? (
          <Box
            component="img"
            src={source}
            alt=""
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            No image chosen yet.
          </Typography>
        )}
      </Box>

      {usingFallback && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          This is the image that ships with the site. Choose one above to replace it.
        </Alert>
      )}
      {!isActive && image?.url && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Switched off, so the site keeps using its built-in image. Turn Active on to publish this.
        </Alert>
      )}
    </Stack>
  );
};
