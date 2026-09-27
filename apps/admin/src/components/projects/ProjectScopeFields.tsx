import { SDG_GOALS } from '@iaa/shared';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useId } from 'react';

import type { FieldErrors, PartnerRow } from './project-form';

/** Most objectives and partners a project keeps; the API refuses more. */
const MAX_OBJECTIVES = 20;
const MAX_PARTNERS = 30;

/** Moves one entry up or down a list, returning a new list. */
export const moveItem = <T,>(items: readonly T[], index: number, offset: -1 | 1): T[] => {
  const target = index + offset;
  if (target < 0 || target >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved as T);
  return next;
};

const FieldHeading = ({ title, hint }: { title: string; hint: string }): JSX.Element => (
  <Box>
    <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {hint}
    </Typography>
  </Box>
);

/** Move up, move down and remove, the keyboard-friendly way to reorder a list. */
const RowControls = ({
  index,
  count,
  noun,
  onMove,
  onRemove,
  disabled,
}: {
  index: number;
  count: number;
  noun: string;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
  disabled?: boolean;
}): JSX.Element => (
  <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
    <Tooltip title="Move up">
      <span>
        <IconButton
          size="small"
          aria-label={`Move ${noun} ${index + 1} up`}
          onClick={() => onMove(-1)}
          disabled={disabled || index === 0}
        >
          <ArrowUpwardRoundedIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
    <Tooltip title="Move down">
      <span>
        <IconButton
          size="small"
          aria-label={`Move ${noun} ${index + 1} down`}
          onClick={() => onMove(1)}
          disabled={disabled || index === count - 1}
        >
          <ArrowDownwardRoundedIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
    <Tooltip title="Remove">
      <IconButton
        size="small"
        aria-label={`Remove ${noun} ${index + 1}`}
        onClick={onRemove}
        disabled={disabled}
      >
        <DeleteOutlineRoundedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  </Stack>
);

export interface ObjectivesFieldProps {
  value: string[];
  onChange: (next: string[]) => void;
  errors: FieldErrors;
  disabled?: boolean;
}

/** What the project sets out to achieve, one line each, in order. */
export const ObjectivesField = ({
  value,
  onChange,
  errors,
  disabled,
}: ObjectivesFieldProps): JSX.Element => {
  const update = (index: number, text: string): void =>
    onChange(value.map((line, position) => (position === index ? text : line)));
  return (
    <Stack spacing={1.5}>
      <FieldHeading
        title="Objectives"
        hint="What the project sets out to achieve, one per line. Blank lines are ignored."
      />
      {value.map((line, index) => (
        <Stack key={index} direction="row" spacing={1} alignItems="flex-start">
          <TextField
            fullWidth
            size="small"
            label={`Objective ${index + 1}`}
            value={line}
            onChange={(event) => update(index, event.target.value)}
            error={Boolean(errors[`objectives.${index}`])}
            helperText={errors[`objectives.${index}`]}
            slotProps={{ htmlInput: { maxLength: 300 } }}
            disabled={disabled}
          />
          <RowControls
            index={index}
            count={value.length}
            noun="objective"
            onMove={(offset) => onChange(moveItem(value, index, offset))}
            onRemove={() => onChange(value.filter((_, position) => position !== index))}
            disabled={disabled}
          />
        </Stack>
      ))}
      <Box>
        <Button
          startIcon={<AddRoundedIcon />}
          onClick={() => onChange([...value, ''])}
          disabled={disabled || value.length >= MAX_OBJECTIVES}
        >
          Add an objective
        </Button>
      </Box>
    </Stack>
  );
};

export interface PartnersFieldProps {
  value: PartnerRow[];
  onChange: (next: PartnerRow[]) => void;
  errors: FieldErrors;
  disabled?: boolean;
}

/** Organisations the project works with: a name, what they do, and a link if they have one. */
export const PartnersField = ({
  value,
  onChange,
  errors,
  disabled,
}: PartnersFieldProps): JSX.Element => {
  const update = (index: number, change: Partial<PartnerRow>): void =>
    onChange(value.map((row, position) => (position === index ? { ...row, ...change } : row)));
  return (
    <Stack spacing={1.5}>
      <FieldHeading
        title="Partners"
        hint="Organisations you deliver with. They do not need to be on the website's Partners page."
      />
      {value.map((row, index) => (
        <Box
          key={index}
          sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2.5 }}
          role="group"
          aria-label={`Partner ${index + 1}`}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 650 }}>
              Partner {index + 1}
            </Typography>
            <RowControls
              index={index}
              count={value.length}
              noun="partner"
              onMove={(offset) => onChange(moveItem(value, index, offset))}
              onRemove={() => onChange(value.filter((_, position) => position !== index))}
              disabled={disabled}
            />
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
            }}
          >
            <TextField
              size="small"
              label="Name"
              value={row.name}
              onChange={(event) => update(index, { name: event.target.value })}
              error={Boolean(errors[`partners.${index}.name`])}
              helperText={errors[`partners.${index}.name`]}
              slotProps={{ htmlInput: { maxLength: 120 } }}
              disabled={disabled}
            />
            <TextField
              size="small"
              label="Role (optional)"
              placeholder="Venue host, funder, trainer…"
              value={row.role}
              onChange={(event) => update(index, { role: event.target.value })}
              slotProps={{ htmlInput: { maxLength: 120 } }}
              disabled={disabled}
            />
            <TextField
              size="small"
              label="Website (optional)"
              placeholder="https://"
              value={row.url}
              onChange={(event) => update(index, { url: event.target.value })}
              error={Boolean(errors[`partners.${index}.url`])}
              helperText={errors[`partners.${index}.url`]}
              disabled={disabled}
            />
          </Box>
        </Box>
      ))}
      <Box>
        <Button
          startIcon={<AddRoundedIcon />}
          onClick={() => onChange([...value, { name: '', role: '', url: '' }])}
          disabled={disabled || value.length >= MAX_PARTNERS}
        >
          Add a partner
        </Button>
      </Box>
    </Stack>
  );
};

export interface SdgFieldProps {
  value: number[];
  onChange: (next: number[]) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * The UN Sustainable Development Goals the project contributes to. Offers the
 * goals the website already describes; a goal saved earlier that the website
 * does not describe stays selected and can be removed.
 */
export const SdgField = ({ value, onChange, error, disabled }: SdgFieldProps): JSX.Element => {
  const headingId = useId();
  const known = new Set(SDG_GOALS.map((goal) => goal.number));
  const others = value.filter((goal) => !known.has(goal));
  const toggle = (goal: number): void =>
    onChange(value.includes(goal) ? value.filter((item) => item !== goal) : [...value, goal]);
  const choices = [
    ...SDG_GOALS.map((goal) => ({
      number: goal.number,
      title: goal.title,
      note: goal.contribution,
    })),
    ...others.map((goal) => ({
      number: goal,
      title: 'Another goal',
      note: 'Saved earlier. The website does not describe this goal.',
    })),
  ];
  return (
    <Stack spacing={1.5} role="group" aria-labelledby={headingId}>
      <Box>
        <Typography id={headingId} component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
          Sustainable Development Goals
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This project contributes to… Choose every goal that applies.
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        {choices.map((goal) => {
          const selected = value.includes(goal.number);
          return (
            <ButtonBase
              key={goal.number}
              role="checkbox"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => toggle(goal.number)}
              sx={{
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                textAlign: 'left',
                gap: 1.25,
                p: 1.5,
                borderRadius: 2.5,
                border: 1,
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: (theme) =>
                  selected ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                '&.Mui-focusVisible': {
                  outline: 2,
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                },
              }}
            >
              <Box
                aria-hidden
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 1.5,
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  color: selected ? 'common.black' : 'text.primary',
                  bgcolor: selected ? 'primary.main' : 'action.hover',
                }}
              >
                {selected ? <CheckCircleRoundedIcon sx={{ fontSize: 18 }} /> : goal.number}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Goal {goal.number}: {goal.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {goal.note}
                </Typography>
              </Box>
            </ButtonBase>
          );
        })}
      </Box>
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Stack>
  );
};
