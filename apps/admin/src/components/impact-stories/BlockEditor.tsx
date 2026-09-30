import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { STORY_BLOCK_LABELS, type StoryBlockType } from '@iaa/shared';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { alpha, type Theme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from 'react';

import { STORY_BLOCK_TYPE_OPTIONS } from '../../lib/select-options';
import { dropZoneSx, handleSx, skinned, surfaceSx, tokenVar } from '../../theme/surfaces';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';

import { BLOCK_FIELD_EDITORS, type BlockFieldsProps } from './blocks';
import {
  blockFieldErrors,
  blockName,
  duplicateBlock,
  newBlock,
  type StoryBlockDraft,
} from './story-form';

export interface BlockEditorProps {
  blocks: StoryBlockDraft[];
  onChange: (blocks: StoryBlockDraft[]) => void;
  /** Show each block's problems: after a Continue or Save attempt. */
  showErrors: boolean;
  disabled?: boolean;
  /** Called with true when an upload starts in any block and false when it ends. */
  onUploadingChange?: (uploading: boolean) => void;
}

// The shared schema's limit on blocks in one story.
const MAX_BLOCKS = 60;

/**
 * What a screen reader hears while a block is dragged from the keyboard.
 *
 * Left to itself dnd-kit announces the raw ids ("Picked up draggable item
 * rich-text-3f9a…"), which are random and mean nothing to the listener. This
 * names the block as the rest of the editor does and says where it is going
 * as a position, the same as the task board speaks of its cards.
 */
export const blockAnnouncements = (blocks: readonly StoryBlockDraft[]): Announcements => {
  const count = blocks.length;
  const indexOf = (id: UniqueIdentifier): number => blocks.findIndex((block) => block.id === id);
  const nameOf = (id: UniqueIdentifier): string => {
    const index = indexOf(id);
    const block = blocks[index];
    return block ? blockName(block, index) : 'The block';
  };
  const positionOf = (id: UniqueIdentifier): string => `position ${indexOf(id) + 1} of ${count}`;
  return {
    onDragStart: ({ active }) =>
      `Picked up ${nameOf(active.id)}. Use the arrow keys to move it, Space to drop it, Escape to cancel.`,
    onDragOver: ({ active, over }) =>
      over ? `${nameOf(active.id)} is over ${positionOf(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} dropped at ${positionOf(over.id)}.`
        : `${nameOf(active.id)} dropped where it was.`,
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
  };
};

const DRAG_INSTRUCTIONS = {
  draggable:
    'To move a block, press Space to pick it up, the arrow keys to move it, and Space again to drop it. The Move up and Move down buttons do the same.',
};

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

const clip = (text: string | undefined, length = 90): string => {
  const value = (text ?? '').replace(/\s+/g, ' ').trim();
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
};

/** One line under a collapsed block's name, so a long story can be scanned. */
const BLOCK_SUMMARIES: { [T in StoryBlockType]: (data: StoryBlockDraftData<T>) => string } = {
  hero: (data) => clip(data.heading),
  'rich-text': (data) => clip(data.markdown?.replace(/[#*_>`[\]()-]/g, '')),
  image: (data) => clip(data.caption ?? data.image?.alt),
  gallery: (data) => plural(data.images?.length ?? 0, 'photo'),
  video: (data) => clip(data.url),
  quote: (data) => clip(data.text),
  metrics: (data) => plural(data.items?.length ?? 0, 'number'),
  timeline: (data) => plural(data.items?.length ?? 0, 'step'),
  partners: (data) => plural(data.items?.length ?? 0, 'partner'),
  cta: (data) => clip(data.label),
};

type StoryBlockDraftData<T extends StoryBlockType> = Extract<StoryBlockDraft, { type: T }>['data'];

const blockSummary = (block: StoryBlockDraft): string =>
  (BLOCK_SUMMARIES[block.type] as (data: StoryBlockDraft['data']) => string)(block.data);

/**
 * A block card picked up by its handle. Classic lifts it on elevation 8; the
 * other skins use their floating shadow, because their elevation 8 is about
 * the depth a card already has at rest.
 */
const DRAGGING_SX = skinned({ boxShadow: 8 }, { boxShadow: tokenVar('overlayShadow') });

/**
 * The square holding the block's icon. Classic keeps its own 12% primary
 * square; the other skins make it one of their icon tiles.
 */
const ICON_TILE_SX = skinned(
  { bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.12) },
  surfaceSx.tile,
);

/**
 * The summary row that opens a block. Classic has no hover of its own and a
 * flush 2px ring; the ring takes the skin's colour everywhere, and the other
 * skins add their list-row hover so the row reads as a control.
 */
const TOGGLE_STATES_SX = skinned(
  { '&.Mui-focusVisible': { outline: tokenVar('focusRing') } },
  { '&:hover': { bgcolor: tokenVar('itemHoverBg'), boxShadow: tokenVar('itemHoverShadow') } },
);

/**
 * The "Add block" menu's corners. Classic keeps the 12px this menu has always
 * had; the other skins round it like every other menu of theirs, since a
 * number here would scale with the skin but not match its overlays.
 */
const MENU_PAPER_SX = skinned({ borderRadius: 3 }, { borderRadius: tokenVar('overlayRadius') });

const ICONS = Object.fromEntries(
  STORY_BLOCK_TYPE_OPTIONS.map((option) => [option.value, option.icon]),
) as Record<StoryBlockType, ReactNode>;

interface BlockCardProps {
  block: StoryBlockDraft;
  index: number;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (block: StoryBlockDraft) => void;
  onMove: (by: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  showErrors: boolean;
  disabled: boolean;
  canAdd: boolean;
  onUploadingChange: (uploading: boolean) => void;
  toggleRef: (node: HTMLButtonElement | null) => void;
}

const CardAction = ({
  title,
  onClick,
  disabled,
  children,
  danger = false,
}: {
  title: string;
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
  danger?: boolean;
}): JSX.Element => (
  <Tooltip title={title}>
    <span>
      <IconButton
        size="small"
        aria-label={title}
        onClick={onClick}
        disabled={disabled}
        sx={danger ? { color: 'error.main' } : undefined}
      >
        {children}
      </IconButton>
    </span>
  </Tooltip>
);

const BlockCard = ({
  block,
  index,
  count,
  expanded,
  onToggle,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
  showErrors,
  disabled,
  canAdd,
  onUploadingChange,
  toggleRef,
}: BlockCardProps): JSX.Element => {
  const panelId = useId();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled });
  const name = blockName(block, index);
  const errors = blockFieldErrors(block);
  const problems = showErrors ? [...new Set(Object.values(errors))] : [];
  const Editor = BLOCK_FIELD_EDITORS[block.type] as ComponentType<BlockFieldsProps<StoryBlockType>>;
  const summary = blockSummary(block);

  return (
    <Box
      ref={setNodeRef}
      component="section"
      aria-label={name}
      sx={[
        {
          position: 'relative',
          zIndex: isDragging ? 2 : 'auto',
          transform: CSS.Transform.toString(transform),
          transition,
          borderRadius: 3,
          opacity: isDragging ? 0.92 : 1,
          // A card inside the editor's card: the skin's nested card, quieter
          // than the editor so depth does not double up (in Classic, paper
          // with a divider border and no shadow).
          ...surfaceSx.nested,
        },
        // A whole border in the error colour, since some skins draw raised
        // elements without one and the problem must still show.
        problems.length > 0 && { border: 1, borderColor: 'error.main' },
        isDragging && DRAGGING_SX,
      ]}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 0.5,
          p: { xs: 1, sm: 1.25 },
        }}
      >
        <Tooltip title="Drag to reorder">
          <IconButton
            ref={setActivatorNodeRef}
            size="small"
            aria-label={`Drag ${name} to reorder`}
            disabled={disabled}
            sx={{ cursor: disabled ? 'default' : 'grab', touchAction: 'none', ...handleSx }}
            {...attributes}
            {...listeners}
          >
            <DragIndicatorRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <ButtonBase
          ref={toggleRef}
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          sx={[
            {
              flex: '1 1 180px',
              minWidth: 0,
              justifyContent: 'flex-start',
              gap: 1.25,
              px: 1,
              py: 0.75,
              borderRadius: 2,
              textAlign: 'left',
            },
            TOGGLE_STATES_SX,
          ]}
        >
          <Box
            aria-hidden
            sx={[
              {
                display: 'grid',
                placeItems: 'center',
                width: 34,
                height: 34,
                flexShrink: 0,
                borderRadius: 2,
                color: 'text.primary',
                '& svg': { fontSize: 19 },
              },
              ICON_TILE_SX,
            ]}
          >
            {ICONS[block.type]}
          </Box>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.92rem' }}>
              {index + 1}. {STORY_BLOCK_LABELS[block.type]}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {summary || 'Not filled in yet'}
            </Typography>
          </Box>
          {problems.length > 0 && (
            <Chip
              size="small"
              color="error"
              variant="outlined"
              label={plural(problems.length, 'problem')}
            />
          )}
          <ExpandMoreRoundedIcon
            aria-hidden
            sx={{ transition: 'transform 160ms', transform: expanded ? 'rotate(180deg)' : 'none' }}
          />
        </ButtonBase>
        <Stack direction="row" spacing={0.25} sx={{ ml: 'auto' }}>
          <CardAction
            title={`Move ${name} up`}
            onClick={() => onMove(-1)}
            disabled={disabled || index === 0}
          >
            <ArrowUpwardRoundedIcon fontSize="small" />
          </CardAction>
          <CardAction
            title={`Move ${name} down`}
            onClick={() => onMove(1)}
            disabled={disabled || index === count - 1}
          >
            <ArrowDownwardRoundedIcon fontSize="small" />
          </CardAction>
          <CardAction
            title={`Duplicate ${name}`}
            onClick={onDuplicate}
            disabled={disabled || !canAdd}
          >
            <ContentCopyRoundedIcon fontSize="small" />
          </CardAction>
          <CardAction title={`Remove ${name}`} onClick={onRemove} disabled={disabled} danger>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </CardAction>
        </Stack>
      </Box>
      <Collapse in={expanded}>
        <Box id={panelId} sx={{ px: { xs: 1.5, sm: 2.5 }, pb: { xs: 2, sm: 2.5 }, pt: 1 }}>
          {problems.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Finish this block before you continue:
              </Typography>
              <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </Box>
            </Alert>
          )}
          <Editor
            data={block.data}
            onChange={(data) => onChange({ ...block, data } as StoryBlockDraft)}
            errors={errors}
            showErrors={showErrors}
            disabled={disabled}
            onUploadingChange={onUploadingChange}
          />
        </Box>
      </Collapse>
    </Box>
  );
};

const AddBlockButton = ({
  onAdd,
  disabled,
  full,
}: {
  onAdd: (type: StoryBlockType) => void;
  disabled: boolean;
  full: boolean;
}): JSX.Element => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  return (
    <>
      <Button
        variant="outlined"
        startIcon={<AddRoundedIcon />}
        onClick={(event) => setAnchor(event.currentTarget)}
        disabled={disabled || full}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-controls={anchor ? menuId : undefined}
        sx={{ alignSelf: 'flex-start' }}
      >
        {full ? `A story holds up to ${MAX_BLOCKS} blocks` : 'Add block'}
      </Button>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: [{ maxWidth: 380 }, MENU_PAPER_SX] } }}
      >
        {STORY_BLOCK_TYPE_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => {
              setAnchor(null);
              onAdd(option.value as StoryBlockType);
            }}
            sx={{ alignItems: 'flex-start', whiteSpace: 'normal', py: 1 }}
          >
            <ListItemIcon sx={{ mt: 0.5 }}>{option.icon}</ListItemIcon>
            <ListItemText primary={option.label} secondary={option.description} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

/**
 * The story body as a list of blocks: add one from the menu, fill it in, and
 * put it in order by dragging or with the move buttons.
 *
 * Every drag has a button alternative (plan D13), and the drag handle itself
 * works from the keyboard (space to lift, arrows to move, space to drop).
 * Removing a block asks first, naming it, because its contents go with it.
 */
export const BlockEditor = ({
  blocks,
  onChange,
  showErrors,
  disabled = false,
  onUploadingChange = () => undefined,
}: BlockEditorProps): JSX.Element => {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [removing, setRemoving] = useState<StoryBlockDraft | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const toggles = useRef(new Map<string, HTMLButtonElement>());
  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so a click on the handle is not a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Touch waits briefly so the page can still scroll under a finger.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const full = blocks.length >= MAX_BLOCKS;
  // The blocks as they are now. An upload finishes long after the render that
  // started it, and its callback must not write that render's copy of the
  // list back over edits made in the meantime.
  const latest = useRef(blocks);
  latest.current = blocks;

  useEffect(() => {
    if (focusId) {
      toggles.current.get(focusId)?.focus();
      setFocusId(null);
    }
  }, [focusId]);

  const add = (type: StoryBlockType): void => {
    const block = newBlock(type);
    onChange([...blocks, block]);
    setFocusId(block.id);
  };
  // By id rather than position, so a block moved while its upload ran still
  // receives its own picture.
  const replace = (block: StoryBlockDraft): void =>
    onChange(latest.current.map((current) => (current.id === block.id ? block : current)));
  const move = (index: number, by: -1 | 1): void => {
    const target = index + by;
    if (target >= 0 && target < blocks.length) onChange(arrayMove(blocks, index, target));
  };
  const duplicate = (index: number): void => {
    const source = blocks[index];
    if (!source || full) return;
    const copy = duplicateBlock(source);
    onChange([...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)]);
    setFocusId(copy.id);
  };
  const toggle = (id: string): void =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const dragEnd = ({ active, over }: DragEndEvent): void => {
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((block) => block.id === active.id);
    const to = blocks.findIndex((block) => block.id === over.id);
    if (from !== -1 && to !== -1) onChange(arrayMove(blocks, from, to));
  };
  const removingIndex = removing ? blocks.findIndex((block) => block.id === removing.id) : -1;

  return (
    <Stack spacing={2}>
      {blocks.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2.5,
            border: 1,
            borderStyle: 'dashed',
            borderRadius: 3,
            // Where the first block will go: the skin's empty drop zone (in
            // Classic, divider dashes on nothing).
            ...dropZoneSx,
          }}
        >
          <ViewAgendaOutlinedIcon sx={{ color: 'text.secondary' }} aria-hidden />
          <Typography variant="body2" color="text.secondary">
            No blocks yet. Start with a hero to open the story, then add text, photos, numbers and
            quotes.
          </Typography>
        </Box>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={dragEnd}
          accessibility={{
            announcements: blockAnnouncements(blocks),
            screenReaderInstructions: DRAG_INSTRUCTIONS,
          }}
        >
          <SortableContext
            items={blocks.map((block) => block.id)}
            strategy={verticalListSortingStrategy}
          >
            <Stack spacing={1.5}>
              {blocks.map((block, index) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  index={index}
                  count={blocks.length}
                  expanded={!collapsed.has(block.id)}
                  onToggle={() => toggle(block.id)}
                  onChange={replace}
                  onMove={(by) => move(index, by)}
                  onDuplicate={() => duplicate(index)}
                  onRemove={() => setRemoving(block)}
                  showErrors={showErrors}
                  disabled={disabled}
                  canAdd={!full}
                  onUploadingChange={onUploadingChange}
                  toggleRef={(node) => {
                    if (node) toggles.current.set(block.id, node);
                    else toggles.current.delete(block.id);
                  }}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      )}
      <AddBlockButton onAdd={add} disabled={disabled} full={full} />
      <ConfirmDialog
        open={removing !== null}
        title="Remove this block?"
        eyebrow="Impact story"
        description={
          removing ? (
            <>
              <strong>{blockName(removing, Math.max(removingIndex, 0))}</strong> and everything in
              it will be taken out of the story. This is not saved until you save the story.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Remove"
        tone="error"
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) onChange(blocks.filter((block) => block.id !== removing.id));
          setRemoving(null);
        }}
      />
    </Stack>
  );
};
