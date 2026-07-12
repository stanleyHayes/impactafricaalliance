import type { MediaAsset } from '@iaa/shared';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { formatUtcDate } from '../../lib/date';
import type { FieldConfig, ResourceConfig, ResourceRow } from '../../resources/types';
import { Markdown } from '../markdown/Markdown';

import { ArticleDetailDialog } from './ArticleDetailDialog';

const Empty = (): JSX.Element => (
  <Typography variant="body2" color="text.disabled">
    —
  </Typography>
);

type ValueRenderer = (field: FieldConfig, value: unknown) => JSX.Element;

const renderImage: ValueRenderer = (field, value) => {
  const url = (value as MediaAsset | undefined)?.url;
  return url ? (
    <Box
      component="img"
      src={url}
      alt={field.label}
      sx={{
        display: 'block',
        width: '100%',
        maxHeight: 300,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2.5,
        objectFit: 'cover',
      }}
    />
  ) : (
    <Empty />
  );
};

const renderFile: ValueRenderer = (_field, value) => {
  const url = (value as MediaAsset | undefined)?.url;
  return url ? (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}
    >
      Open file <OpenInNewIcon sx={{ fontSize: 15 }} />
    </Link>
  ) : (
    <Empty />
  );
};

const renderRichText: ValueRenderer = (_field, value) =>
  typeof value === 'string' && value.trim() ? <Markdown>{value}</Markdown> : <Empty />;

const renderSwitch: ValueRenderer = (_field, value) => (
  <Chip size="small" label={value ? 'Yes' : 'No'} color={value ? 'success' : 'default'} />
);

const renderTags: ValueRenderer = (_field, value) =>
  Array.isArray(value) && value.length > 0 ? (
    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
      {(value as string[]).map((tag) => (
        <Chip key={tag} size="small" variant="outlined" label={tag} />
      ))}
    </Stack>
  ) : (
    <Empty />
  );

const renderSelect: ValueRenderer = (_field, value) =>
  value ? (
    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
      {String(value)}
    </Typography>
  ) : (
    <Empty />
  );

const renderDateTime: ValueRenderer = (_field, value) => {
  const iso = typeof value === 'string' ? value : null;
  return iso ? (
    <Typography variant="body2">
      {formatUtcDate(iso, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </Typography>
  ) : (
    <Empty />
  );
};

const renderNumber: ValueRenderer = (_field, value) => {
  const empty = value === undefined || value === null || value === '';
  return empty ? <Empty /> : <Typography variant="body2">{String(value)}</Typography>;
};

const renderText: ValueRenderer = (_field, value) =>
  typeof value === 'string' && value.trim() ? (
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {value}
    </Typography>
  ) : (
    <Empty />
  );

const VALUE_RENDERERS: Partial<Record<FieldConfig['type'], ValueRenderer>> = {
  image: renderImage,
  file: renderFile,
  richtext: renderRichText,
  switch: renderSwitch,
  tags: renderTags,
  select: renderSelect,
  datetime: renderDateTime,
  number: renderNumber,
};

/** Read-only rendering of a single field's value, by field type. */
const FieldValue = ({ field, value }: { field: FieldConfig; value: unknown }): JSX.Element => {
  const renderValue = VALUE_RENDERERS[field.type] ?? renderText;
  return renderValue(field, value);
};

interface ResourceDetailDialogProps {
  resource: ResourceConfig;
  open: boolean;
  row: ResourceRow | null;
  onClose: () => void;
  onEdit?: () => void;
  canEdit: boolean;
}

/** Read-only detail view of a single resource record. */
export const ResourceDetailDialog = ({
  resource,
  open,
  row,
  onClose,
  onEdit,
  canEdit,
}: ResourceDetailDialogProps): JSX.Element => {
  if (resource.key === 'articles') {
    return (
      <ArticleDetailDialog
        open={open}
        row={row}
        onClose={onClose}
        onEdit={onEdit}
        canEdit={canEdit}
      />
    );
  }

  const heading =
    (typeof row?.title === 'string' && row.title) ||
    (typeof row?.name === 'string' && row.name) ||
    (typeof row?.label === 'string' && row.label) ||
    `${resource.singular} details`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                color: 'text.primary',
                fontWeight: 750,
                letterSpacing: '0.1em',
              }}
            >
              {resource.singular} record
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.25, lineHeight: 1.25 }}>
              {heading}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Review the saved information and attached assets.
            </Typography>
          </Box>
          <IconButton aria-label="Close details" onClick={onClose} sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'background.default', py: 3 }}>
        {row ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1.5,
            }}
          >
            {resource.fields.map((field) => (
              <Box
                key={field.name}
                sx={{
                  minWidth: 0,
                  gridColumn: field.wide ? '1 / -1' : 'auto',
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mb: 0.75,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  {field.label}
                </Typography>
                <FieldValue field={field} value={row[field.name]} />
              </Box>
            ))}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose}>Close</Button>
        {canEdit && onEdit && (
          <Button variant="contained" startIcon={<EditIcon />} onClick={onEdit}>
            Edit
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
