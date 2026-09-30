import { siteImageDependants } from '@iaa/shared';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useCan } from '../../auth/useCan';
import {
  aspectLabel,
  publicSiteUrl,
  recommendedSize,
  thumbnailUrl,
  type SlotView,
} from '../../lib/site-images';
import { surfaceSx } from '../../theme/surfaces';

export interface SlotPermissions {
  /** Upload a first picture for a slot that has no record. */
  create: boolean;
  /** Change, describe or reset a slot that has one. */
  update: boolean;
}

interface SiteImageSlotCardProps {
  view: SlotView;
  can: SlotPermissions;
  onReplace: (view: SlotView) => void;
  onEditAlt: (view: SlotView) => void;
  onReset: (view: SlotView) => void;
}

const STATUS_CHIP: Record<
  SlotView['status'],
  { label: string; color: 'success' | 'info' | 'default' }
> = {
  replaced: { label: 'Replaced', color: 'success' },
  shared: { label: 'Shared upload', color: 'info' },
  original: { label: 'Default', color: 'default' },
};

/**
 * Every card's picture sits in a frame of one height, cropped to the slot's
 * own shape inside it. Cropped to the full card width instead, a portrait
 * slot stood three times as tall as a banner and left gaps across the row.
 */
const FRAME_HEIGHT = 190;

/** "21 / 9" as the number 2.33. */
const aspectRatioOf = (slot: SlotView['slot']): number => {
  const [width = 16, height = 9] = slot.aspect.split('/').map((part) => Number(part.trim()));
  return width / height;
};

/** What a screen reader hears for this slot, in a sentence. */
const altSummary = (view: SlotView): string => {
  if (view.slot.decorative) return 'Decorative: drawn behind text, so screen readers skip it.';
  return view.resolved.alt ? `Alt text: “${view.resolved.alt}”` : 'Alt text: none yet.';
};

/** Why the slot shows what it shows, when that is not simply its own picture. */
const Provenance = ({ view }: { view: SlotView }): JSX.Element | null => {
  const dependants = siteImageDependants(view.slot.key);
  return (
    <>
      {view.status === 'shared' && view.resolved.inheritedFrom && (
        <Typography variant="caption" color="text.secondary">
          Showing the {view.resolved.inheritedFrom.label.toLowerCase()} until this has a picture of
          its own.
        </Typography>
      )}
      {view.record && !view.record.isActive && (
        <Typography variant="caption" color="text.secondary">
          An earlier replacement is saved but not shown. Replace offers it again, or choose another
          picture.
        </Typography>
      )}
      {dependants.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          Also shown on {dependants.map((slot) => slot.label).join(', ')} until they have their own.
        </Typography>
      )}
    </>
  );
};

/**
 * Says so when the upload cannot be loaded: the site quietly draws the
 * shipped picture instead, so without this nobody would know to fix it.
 */
const BrokenNote = ({ broken }: { broken: boolean }): JSX.Element | null =>
  broken ? (
    <Alert severity="error" role="note" sx={{ borderRadius: 2, py: 0 }}>
      This picture could not be loaded, so the site shows the default instead. Replace it with
      another.
    </Alert>
  ) : null;

/**
 * Says so when a Page Settings hero image is what visitors actually see. The
 * way there is offered only to someone who may change Page Settings.
 */
const PageSettingNote = ({ view }: { view: SlotView }): JSX.Element | null => {
  const can = useCan();
  const mayEdit = can('read', 'page-settings') && can('update', 'page-settings');
  if (!view.pageSettingOverride) return null;
  return (
    <Alert severity="warning" role="note" sx={{ borderRadius: 2, py: 0 }}>
      Page Settings has a hero image for this page, and the site shows that instead.
      {mayEdit && (
        <>
          {' '}
          <Link
            component={RouterLink}
            to={`/content/page-settings/${view.pageSettingOverride.id}/edit`}
          >
            Open Page Settings
          </Link>
        </>
      )}
    </Alert>
  );
};

/**
 * One place on the site that shows a picture: the picture it shows now, in
 * the shape the site crops it to, where it appears, what size it wants, what
 * a screen reader hears, and the three things an editor can do about it.
 */
export const SiteImageSlotCard = ({
  view,
  can,
  onReplace,
  onEditAlt,
  onReset,
}: SiteImageSlotCardProps): JSX.Element => {
  const { slot, resolved, record } = view;
  const status = STATUS_CHIP[view.status];
  const live = view.status === 'replaced';
  const mayReplace = record ? can.update : can.create;
  const altLocked = !live;
  // An upload that will not load, remembered by address so a new one is tried afresh.
  const [failedSrc, setFailedSrc] = useState<string>();
  const broken = resolved.source !== 'default' && failedSrc === resolved.src;
  const shown = broken ? slot.fallback : resolved.src;

  return (
    <Box
      component="article"
      aria-label={slot.label}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // The skin's card (Classic: paper with a hairline).
        ...surfaceSx.card,
        borderRadius: 2.5,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: FRAME_HEIGHT,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.hover',
        }}
      >
        <Box
          component="img"
          src={thumbnailUrl(publicSiteUrl(shown))}
          alt=""
          onError={() => setFailedSrc(resolved.src)}
          loading="lazy"
          sx={{
            display: 'block',
            aspectRatio: slot.aspect,
            // As wide as the card allows, but never taller than the frame.
            width: `min(100%, ${Math.floor(FRAME_HEIGHT * aspectRatioOf(slot))}px)`,
            objectFit: 'cover',
          }}
        />
        <Chip
          size="small"
          label={status.label}
          color={status.color}
          variant={view.status === 'original' ? 'outlined' : 'filled'}
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            fontWeight: 700,
            ...(view.status === 'original' ? { bgcolor: 'background.paper' } : {}),
          }}
        />
      </Box>

      <Stack spacing={1.25} sx={{ p: 2, flexGrow: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 750, lineHeight: 1.3 }}>{slot.label}</Typography>
          <Typography variant="caption" color="text.secondary">
            {slot.section}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {slot.usage}
        </Typography>
        <Stack spacing={0.5}>
          <Typography variant="caption">
            <strong>Best size:</strong> {recommendedSize(slot)} ({aspectLabel(slot)})
          </Typography>
          <Typography variant="caption" sx={{ wordBreak: 'break-word' }}>
            {altSummary(view)}
          </Typography>
          <Provenance view={view} />
        </Stack>
        <BrokenNote broken={broken} />
        <PageSettingNote view={view} />

        <Box sx={{ flexGrow: 1 }} />
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" alignItems="center">
          {mayReplace && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddPhotoAlternateOutlinedIcon />}
              onClick={() => onReplace(view)}
            >
              Replace
            </Button>
          )}
          {can.update && !slot.decorative && (
            <Tooltip
              title={
                altLocked
                  ? 'Replace the picture first. The original keeps its own description.'
                  : ''
              }
            >
              {/* A span, so the tooltip still explains a disabled button. */}
              <span>
                <Button
                  size="small"
                  startIcon={<EditNoteRoundedIcon />}
                  disabled={altLocked}
                  onClick={() => onEditAlt(view)}
                >
                  Edit alt text
                </Button>
              </span>
            </Tooltip>
          )}
          {can.update && live && (
            <Button
              size="small"
              color="error"
              startIcon={<RestartAltRoundedIcon />}
              onClick={() => onReset(view)}
            >
              Reset to default
            </Button>
          )}
          <Link
            href={publicSiteUrl(slot.previewPath)}
            target="_blank"
            rel="noopener noreferrer"
            variant="caption"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, ml: 'auto' }}
          >
            See it on the site <OpenInNewIcon sx={{ fontSize: 13 }} />
          </Link>
        </Stack>
      </Stack>
    </Box>
  );
};
