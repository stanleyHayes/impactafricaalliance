import { PROJECT_MEDIA_LIMIT, type ProjectMediaItem } from '@iaa/shared';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { useCan } from '../../auth/useCan';
import { DetailSection } from '../../components/detail/DetailSection';
import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { countLabel, formatDay } from '../../components/projects/project-format';
import { MediaItemDialog } from '../../components/projects/ProjectDialogs';
import { ProjectPhotoUpload } from '../../components/projects/ProjectPhotoUpload';
import { READ_ONLY_NOTE, useProjectOutlet } from '../../components/projects/useProjectOutlet';
import {
  useAddProjectMedia,
  useRemoveProjectMedia,
  useUpdateProjectMedia,
} from '../../lib/projects';

const photoName = (item: ProjectMediaItem): string => item.caption ?? 'this photo';

const PhotoCard = ({
  item,
  canUpdate,
  busy,
  onEdit,
  onRemove,
}: {
  item: ProjectMediaItem;
  canUpdate: boolean;
  busy: boolean;
  onEdit: () => void;
  onRemove: () => void;
}): JSX.Element => (
  <Card component="li" variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', minWidth: 0 }}>
    <Box
      component="img"
      src={item.image.url}
      // Evidence is content, not decoration: without a caption it still says what it is.
      alt={item.caption ?? item.image.alt ?? `Photo added ${formatDay(item.addedAt)}, no caption`}
      loading="lazy"
      sx={{ display: 'block', width: '100%', aspectRatio: '4 / 3', objectFit: 'cover' }}
    />
    <Stack spacing={1} sx={{ p: 1.5 }}>
      <Chip
        size="small"
        icon={item.shareable ? <PublicOutlinedIcon /> : <LockOutlinedIcon />}
        color={item.shareable ? 'success' : 'default'}
        variant={item.shareable ? 'filled' : 'outlined'}
        label={item.shareable ? 'Cleared for public use' : 'Internal only'}
        sx={{ alignSelf: 'flex-start' }}
      />
      <Typography variant="body2" sx={{ fontWeight: item.caption ? 600 : 400 }}>
        {item.caption ?? (
          <Box component="span" sx={{ color: 'text.secondary' }}>
            No caption
          </Box>
        )}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {[
          item.takenOn ? `Taken ${formatDay(item.takenOn)}` : null,
          `Added by ${item.addedBy?.name ?? 'a former colleague'}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Typography>
      {canUpdate && (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Edit details">
            <IconButton
              size="small"
              aria-label={`Edit ${photoName(item)}`}
              onClick={onEdit}
              disabled={busy}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove">
            <IconButton
              size="small"
              aria-label={`Remove ${photoName(item)}`}
              onClick={onRemove}
              disabled={busy}
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )}
    </Stack>
  </Card>
);

/**
 * The project's Media & evidence tab: photos of the work, each marked as
 * cleared for public use or kept internal. Only cleared photos can be copied
 * into an impact story, so consent is recorded here, photo by photo.
 */
const ProjectMediaTab = (): JSX.Element => {
  const { project } = useProjectOutlet();
  const can = useCan();
  const canUpdate = can('update', 'projects');
  const add = useAddProjectMedia(project.id);
  const edit = useUpdateProjectMedia(project.id);
  const remove = useRemoveProjectMedia(project.id);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<ProjectMediaItem | null>(null);
  const [removing, setRemoving] = useState<ProjectMediaItem | null>(null);
  const media = project.media;
  const shareable = media.filter((item) => item.shareable).length;
  const busy = uploading || remove.isPending;

  return (
    <Stack spacing={3}>
      {!canUpdate && <Alert severity="info">{READ_ONLY_NOTE}</Alert>}
      <Alert severity="info" icon={<PublicOutlinedIcon />}>
        Only photos cleared for public use can go into an impact story. Clear a photo only when
        everyone recognisable in it has agreed to it being published.
      </Alert>
      <DetailSection
        title="Media & evidence"
        icon={<PhotoLibraryOutlinedIcon />}
        description={`${countLabel(media.length, 'photo')}, ${shareable} cleared for public use.`}
      >
        <Stack spacing={3}>
          {canUpdate && (
            <ProjectPhotoUpload
              remaining={PROJECT_MEDIA_LIMIT - media.length}
              onUploaded={(image) => add.mutateAsync({ image, shareable: false })}
              onUploadingChange={setUploading}
              disabled={remove.isPending}
            />
          )}
          {media.length === 0 ? (
            <EmptyState
              compact
              icon={<PhotoLibraryOutlinedIcon />}
              title="No photos yet"
              description="Photos from visits, sessions and events show the work happened. They appear here once added."
            />
          ) : (
            <Box
              component="ul"
              sx={{
                listStyle: 'none',
                m: 0,
                p: 0,
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: 'repeat(1, minmax(0, 1fr))',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(3, minmax(0, 1fr))',
                  xl: 'repeat(4, minmax(0, 1fr))',
                },
              }}
            >
              {media.map((item) => (
                <PhotoCard
                  key={item.id}
                  item={item}
                  canUpdate={canUpdate}
                  busy={busy}
                  onEdit={() => setEditing(item)}
                  onRemove={() => setRemoving(item)}
                />
              ))}
            </Box>
          )}
        </Stack>
      </DetailSection>

      {editing && (
        <MediaItemDialog
          open
          imageUrl={editing.image.url}
          initial={{
            caption: editing.caption ?? '',
            takenOn: editing.takenOn ?? null,
            shareable: editing.shareable,
          }}
          onSave={(body) => edit.mutateAsync({ itemId: editing.id, body })}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={removing !== null}
        tone="error"
        eyebrow="Projects"
        title="Remove this photo?"
        description={
          <>
            <strong>{removing ? photoName(removing) : ''}</strong> will be removed from this
            project&apos;s evidence. Impact stories that already use a copy of it keep theirs.
          </>
        }
        confirmLabel="Remove"
        pendingLabel="Removing…"
        pending={remove.isPending}
        error={remove.isError ? remove.error.message : null}
        onConfirm={() => {
          if (removing) remove.mutate(removing.id, { onSuccess: () => setRemoving(null) });
        }}
        onClose={() => {
          setRemoving(null);
          remove.reset();
        }}
      />
    </Stack>
  );
};

export default ProjectMediaTab;
