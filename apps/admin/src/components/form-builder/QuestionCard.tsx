import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FormField, FormStep } from '@iaa/shared';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import DriveFileMoveOutlinedIcon from '@mui/icons-material/DriveFileMoveOutlined';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { APPLICANT_MAPPING_OPTIONS, FORM_FIELD_TYPE_OPTIONS } from '../../lib/select-options';
import { handleSx, skinned, surfaceSx, tokenVar } from '../../theme/surfaces';

import { MAX_FIELDS_PER_STEP } from './builder-model';
import { FieldEditor } from './FieldEditor';
import { FieldPreview } from './FieldPreview';

export interface QuestionCardProps {
  field: FormField;
  index: number;
  count: number;
  /** Every step, for "Move to step", with its questions so a full step can be refused. */
  steps: readonly Pick<FormStep, 'id' | 'title' | 'fields'>[];
  stepId: string;
  expanded: boolean;
  onToggle: () => void;
  onChange: (field: FormField) => void;
  onMove: (offset: -1 | 1) => void;
  onMoveToStep: (stepId: string) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  earlierFields: readonly FormField[];
  problems: readonly string[];
  showErrors: boolean;
  disabled: boolean;
}

const chipSx = { height: 20 };

/**
 * A question card picked up by its handle. Classic lifts it on elevation 8.
 * The other skins use their floating shadow, because their elevation 8 is
 * about the depth a card already has at rest, so a dragged card would not
 * look lifted.
 */
const DRAGGING_SX = skinned({ boxShadow: 8 }, { boxShadow: tokenVar('overlayShadow') });

/**
 * The summary row that opens a question. Classic has no hover of its own and
 * a flush 2px ring, which the card's clipped edge needs; the ring takes the
 * skin's colour everywhere. The other skins add their list-row hover, so the
 * row reads as a control.
 */
const TOGGLE_STATES_SX = skinned(
  { '&:focus-visible': { outline: tokenVar('focusRing') } },
  { '&:hover': { bgcolor: tokenVar('itemHoverBg'), boxShadow: tokenVar('itemHoverShadow') } },
);

/** The short facts under a question's label: required, conditional, what it supplies, trouble. */
const QuestionChips = ({
  field,
  needsAttention,
}: {
  field: FormField;
  needsAttention: boolean;
}): JSX.Element => {
  const type = FORM_FIELD_TYPE_OPTIONS.find((option) => option.value === field.type);
  const mapping = APPLICANT_MAPPING_OPTIONS.find((option) => option.value === field.mapsTo);
  const required = field.required || field.type === 'consent';
  return (
    <Stack direction="row" spacing={0.75} sx={{ mt: 0.25, flexWrap: 'wrap', rowGap: 0.5 }}>
      <Typography variant="caption" color="text.secondary">
        {type?.label}
      </Typography>
      {required && <Chip size="small" label="Required" sx={chipSx} />}
      {field.visibility && <Chip size="small" label="Conditional" sx={chipSx} />}
      {mapping && <Chip size="small" label={mapping.label} sx={chipSx} />}
      {needsAttention && (
        <Chip
          size="small"
          color="warning"
          icon={<WarningAmberRoundedIcon />}
          label="Needs attention"
          sx={chipSx}
        />
      )}
    </Stack>
  );
};

const isFull = (step: Pick<FormStep, 'fields'>): boolean =>
  step.fields.length >= MAX_FIELDS_PER_STEP;

/**
 * Duplicate, send to another step, or delete. A step already holding as many
 * questions as a step can is not offered as a place for one more.
 */
const QuestionMenu = ({
  name,
  stepFull,
  otherSteps,
  onDuplicate,
  onMoveToStep,
  onRemove,
  disabled,
}: {
  name: string;
  stepFull: boolean;
  otherSteps: readonly Pick<FormStep, 'id' | 'title' | 'fields'>[];
  onDuplicate: () => void;
  onMoveToStep: (stepId: string) => void;
  onRemove: () => void;
  disabled: boolean;
}): JSX.Element => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = (action?: () => void) => (): void => {
    setAnchor(null);
    action?.();
  };
  return (
    <>
      <IconButton
        aria-label={`More actions for ${name}`}
        size="small"
        onClick={(event) => setAnchor(event.currentTarget)}
        disabled={disabled}
      >
        <MoreVertRoundedIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close()}>
        <MenuItem onClick={close(onDuplicate)} disabled={stepFull}>
          <ListItemIcon>
            <ContentCopyRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        {otherSteps.length > 0 && <Divider />}
        {otherSteps.length > 0 && <ListSubheader>Move to step</ListSubheader>}
        {otherSteps.map((step) => (
          <MenuItem
            key={step.id}
            onClick={close(() => onMoveToStep(step.id))}
            disabled={isFull(step)}
          >
            <ListItemIcon>
              <DriveFileMoveOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={step.title || 'Untitled step'}
              secondary={isFull(step) ? 'This step is full' : undefined}
            />
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={close(onRemove)} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'inherit' }}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete question</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

/**
 * One question in the builder: a summary line that can be dragged, moved up
 * or down, or opened to edit, with a live preview beside the editor.
 *
 * Dragging is only the quick way. Every move also has a button, because a
 * drag is hard on a touch screen and impossible without a pointer.
 */
export const QuestionCard = ({
  field,
  index,
  count,
  steps,
  stepId,
  expanded,
  onToggle,
  onChange,
  onMove,
  onMoveToStep,
  onDuplicate,
  onRemove,
  earlierFields,
  problems,
  showErrors,
  disabled,
}: QuestionCardProps): JSX.Element => {
  const sortable = useSortable({ id: field.id, disabled });
  const type = FORM_FIELD_TYPE_OPTIONS.find((option) => option.value === field.type);
  const labelled = field.label.trim() !== '';
  const name = labelled ? field.label.trim() : 'Untitled question';
  const bodyId = `question-${field.id}`;
  const needsAttention = problems.length > 0 || (showErrors && !labelled);

  return (
    <Paper
      ref={sortable.setNodeRef}
      variant="outlined"
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      sx={[
        {
          borderRadius: 2.5,
          overflow: 'hidden',
          position: 'relative',
          zIndex: sortable.isDragging ? 2 : 'auto',
          // A card inside the step card: the skin's nested card, quieter than
          // the step so depth does not double up (in Classic, paper with a
          // divider border and no shadow).
          ...surfaceSx.nested,
        },
        // A whole border in the warning colour, since some skins draw raised
        // elements without one and the warning must still show.
        needsAttention &&
          ((theme) => ({ border: 1, borderColor: alpha(theme.palette.warning.main, 0.7) })),
        sortable.isDragging && DRAGGING_SX,
      ]}
    >
      {/* On a phone the four buttons would leave the label a word or two, so
          they wrap onto a second line under it; wider screens keep one row. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          columnGap: 0.5,
          px: 1,
          py: 0.75,
          minWidth: 0,
        }}
      >
        <Tooltip title="Drag to reorder">
          <IconButton
            ref={sortable.setActivatorNodeRef}
            {...sortable.attributes}
            {...sortable.listeners}
            aria-label={`Drag to reorder ${name}`}
            size="small"
            disabled={disabled}
            sx={{ cursor: 'grab', touchAction: 'none', ...handleSx }}
          >
            <DragIndicatorRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box
          component="button"
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={bodyId}
          sx={[
            {
              flex: { xs: '1 1 calc(100% - 48px)', sm: '1 1 auto' },
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              py: 0.75,
              px: 0.5,
              border: 0,
              background: 'none',
              color: 'inherit',
              font: 'inherit',
              textAlign: 'left',
              cursor: 'pointer',
              borderRadius: 1.5,
            },
            TOGGLE_STATES_SX,
          ]}
        >
          <Box
            aria-hidden
            sx={{ display: 'flex', color: 'text.secondary', '& svg': { fontSize: 20 } }}
          >
            {type?.icon}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontWeight: 600, fontStyle: labelled ? 'normal' : 'italic' }}>
              {index + 1}. {name}
            </Typography>
            <QuestionChips field={field} needsAttention={needsAttention} />
          </Box>
          <ExpandMoreRoundedIcon
            aria-hidden
            sx={{ transition: 'transform 150ms', transform: expanded ? 'rotate(180deg)' : 'none' }}
          />
        </Box>
        <IconButton
          aria-label={`Move ${name} up`}
          size="small"
          onClick={() => onMove(-1)}
          disabled={disabled || index === 0}
          sx={{ ml: { xs: 'auto', sm: 0 } }}
        >
          <ArrowUpwardRoundedIcon fontSize="small" />
        </IconButton>
        <IconButton
          aria-label={`Move ${name} down`}
          size="small"
          onClick={() => onMove(1)}
          disabled={disabled || index === count - 1}
        >
          <ArrowDownwardRoundedIcon fontSize="small" />
        </IconButton>
        <QuestionMenu
          name={name}
          stepFull={count >= MAX_FIELDS_PER_STEP}
          otherSteps={steps.filter((step) => step.id !== stepId)}
          onDuplicate={onDuplicate}
          onMoveToStep={onMoveToStep}
          onRemove={onRemove}
          disabled={disabled}
        />
      </Box>
      <Collapse in={expanded} unmountOnExit>
        <Box
          id={bodyId}
          sx={{
            p: { xs: 2, md: 2.5 },
            borderTop: 1,
            borderColor: 'divider',
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 3fr) minmax(0, 2fr)' },
            alignItems: 'start',
          }}
        >
          <FieldEditor
            field={field}
            onChange={onChange}
            earlierFields={earlierFields}
            problems={problems}
            showErrors={showErrors}
            disabled={disabled}
          />
          <Box sx={{ position: { lg: 'sticky' }, top: { lg: 96 } }}>
            <FieldPreview field={field} />
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};
