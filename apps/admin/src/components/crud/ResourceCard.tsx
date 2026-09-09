import type { MediaAsset } from '@iaa/shared';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { formatUtcDate } from '../../lib/date';
import type { FieldConfig, ResourceConfig, ResourceRow } from '../../resources/types';
import { InformationItem } from '../InformationItem';

interface ResourceRowActionsProps {
  row: ResourceRow;
  canEdit: boolean;
  canDelete?: boolean;
  onView: (row: ResourceRow) => void;
  onEdit: (row: ResourceRow) => void;
  onDelete: (id: string) => void;
}

const tintButtonSx = (tone: 'primary' | 'error') => ({
  color: tone === 'error' ? 'error.main' : 'text.secondary',
  bgcolor: tone === 'error' ? 'rgba(211,47,47,0.06)' : 'rgba(27,94,32,0.06)',
  '&:hover': { bgcolor: tone === 'error' ? 'rgba(211,47,47,0.12)' : 'rgba(27,94,32,0.12)' },
});

/** Per-row view / edit / delete controls. Edit + delete are gated by permission. */
export const ResourceRowActions = ({
  row,
  canEdit,
  canDelete = false,
  onView,
  onEdit,
  onDelete,
}: ResourceRowActionsProps): JSX.Element => (
  <Stack direction="row" justifyContent="flex-end" spacing={0.5} sx={{ width: '100%' }}>
    <Tooltip title="View">
      <IconButton
        size="small"
        aria-label="View"
        onClick={() => onView(row)}
        sx={tintButtonSx('primary')}
      >
        <VisibilityOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
    {canEdit && (
      <Tooltip title="Edit">
        <IconButton
          size="small"
          aria-label="Edit"
          onClick={() => onEdit(row)}
          sx={tintButtonSx('primary')}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    )}
    {canDelete && (
      <Tooltip title="Delete">
        <IconButton
          size="small"
          aria-label="Delete"
          onClick={() => {
            if (window.confirm('Delete this item? This cannot be undone.')) {
              onDelete(String(row.id));
            }
          }}
          sx={tintButtonSx('error')}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    )}
  </Stack>
);

type ChipColor = 'default' | 'success' | 'primary';

interface CardChip {
  label: string;
  color: ChipColor;
}

interface CardMeta {
  label: string;
  value: string;
}

interface CardModel {
  imageUrl?: string;
  title: string;
  statusChip?: CardChip;
  chips: CardChip[];
  meta: CardMeta[];
  tags: string[];
}

const META_SKIP_TYPES = new Set(['select', 'switch', 'image', 'richtext', 'tags', 'textarea']);

const stringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const formatMeta = (field: FieldConfig, value: unknown): string | undefined => {
  if (field.type === 'datetime' && value) {
    return formatUtcDate(String(value));
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return stringValue(value);
};

/** Select values and truthy switches become small chips under the title. */
const collectChips = (fields: FieldConfig[], row: ResourceRow): CardChip[] => {
  const chips: CardChip[] = [];
  for (const field of fields) {
    const value = row[field.name];
    const selectLabel =
      field.type === 'select' && field.name !== 'status' ? stringValue(value) : undefined;
    if (selectLabel) {
      chips.push({ label: selectLabel.replace(/-/g, ' '), color: 'primary' });
      continue;
    }
    if (field.type === 'switch' && value === true) {
      chips.push({ label: field.label, color: 'success' });
    }
  }
  return chips;
};

/** Up to two remaining primitive fields rendered as "Label: value" lines. */
const collectMeta = (
  fields: FieldConfig[],
  row: ResourceRow,
  excluded: Set<string>,
): CardMeta[] => {
  const meta: CardMeta[] = [];
  for (const field of fields) {
    if (meta.length >= 2 || excluded.has(field.name) || META_SKIP_TYPES.has(field.type)) {
      continue;
    }
    const value = formatMeta(field, row[field.name]);
    if (value) {
      meta.push({ label: field.label, value });
    }
  }
  return meta;
};

/** Derives everything the card needs from the resource config + row. */
const deriveCardModel = (resource: ResourceConfig, row: ResourceRow): CardModel => {
  const imageField = resource.fields.find((field) => field.type === 'image');
  const titleField = resource.fields.find((field) => field.type === 'text');
  const imageUrl = imageField ? (row[imageField.name] as MediaAsset | undefined)?.url : undefined;
  const title = (titleField && stringValue(row[titleField.name])) || resource.singular;

  const status = stringValue(row.status);
  const statusChip: CardChip | undefined = status
    ? { label: status, color: status === 'published' ? 'success' : 'default' }
    : undefined;

  const excluded = new Set(
    [titleField?.name, imageField?.name, 'status'].filter((name): name is string => Boolean(name)),
  );
  const tags = Array.isArray(row.tags) ? (row.tags as string[]).slice(0, 3) : [];

  return {
    imageUrl,
    title,
    statusChip,
    chips: collectChips(resource.fields, row),
    meta: collectMeta(resource.fields, row, excluded),
    tags,
  };
};

const Thumb = ({ imageUrl, icon }: { imageUrl?: string; icon?: JSX.Element }): JSX.Element => (
  <Box
    sx={{
      width: 48,
      height: 48,
      flexShrink: 0,
      borderRadius: 2,
      overflow: 'hidden',
      bgcolor: 'action.hover',
      border: '1px solid',
      borderColor: 'divider',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'text.secondary',
      '& > svg': { fontSize: 24 },
    }}
  >
    {imageUrl ? (
      <Box
        component="img"
        src={imageUrl}
        alt=""
        loading="lazy"
        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    ) : (
      icon
    )}
  </Box>
);

interface ResourceCardProps {
  resource: ResourceConfig;
  row: ResourceRow;
  canEdit: boolean;
  canDelete?: boolean;
  onView: (row: ResourceRow) => void;
  onEdit: (row: ResourceRow) => void;
  onDelete: (id: string) => void;
}

/** Grid-view card for any content collection, derived from the resource config. */
export const ResourceCard = ({
  resource,
  row,
  canEdit,
  canDelete = false,
  onView,
  onEdit,
  onDelete,
}: ResourceCardProps): JSX.Element => {
  const theme = useTheme();
  const model = deriveCardModel(resource, row);
  const hasChips = Boolean(model.statusChip) || model.chips.length > 0;

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2.5,
        transition: theme.transitions.create(['box-shadow', 'border-color', 'transform'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: theme.shadows[3],
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          right: -14,
          top: 12,
          pointerEvents: 'none',
          color: alpha(theme.palette.text.primary, 0.055),
          '& svg': { fontSize: 130 },
        }}
      >
        {resource.icon}
      </Box>
      <Box sx={{ p: 2.5, flexGrow: 1, minWidth: 0, position: 'relative' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Thumb imageUrl={model.imageUrl} icon={resource.icon} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography
              variant="subtitle1"
              noWrap
              title={model.title}
              sx={{ fontWeight: 700, lineHeight: 1.3 }}
            >
              {model.title}
            </Typography>
            {hasChips && (
              <Stack direction="row" sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                {model.statusChip && (
                  <Chip
                    size="small"
                    label={model.statusChip.label}
                    color={model.statusChip.color}
                    sx={{ height: 22, textTransform: 'capitalize' }}
                  />
                )}
                {model.chips.map((chip) => (
                  <Chip
                    key={`${chip.color}-${chip.label}`}
                    size="small"
                    variant="outlined"
                    label={chip.label}
                    sx={{ height: 22, textTransform: 'capitalize' }}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Stack>

        {model.meta.length > 0 && (
          <Stack component="div" spacing={1.75} sx={{ mt: 2.5, mb: 0 }}>
            {model.meta.map((item) => (
              <InformationItem key={item.label} label={item.label}>
                {item.value}
              </InformationItem>
            ))}
          </Stack>
        )}

        {model.tags.length > 0 && (
          <Stack direction="row" sx={{ mt: 1.25, flexWrap: 'wrap', gap: 0.5 }}>
            {model.tags.map((tag) => (
              <Chip key={tag} size="small" label={tag} sx={{ height: 20 }} />
            ))}
          </Stack>
        )}
      </Box>

      <Divider />
      <Box sx={{ px: 1.5, py: 0.75 }}>
        <ResourceRowActions
          row={row}
          canEdit={canEdit}
          canDelete={canDelete}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </Box>
    </Card>
  );
};
