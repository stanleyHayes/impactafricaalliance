import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import FormHelperText from '@mui/material/FormHelperText';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { choiceSx, tokenVar } from '../../theme/surfaces';

export interface ChoiceOption {
  value: string;
  label: string;
  /** One line on what choosing this means. Shown under the label. */
  description?: string;
  icon?: ReactNode;
  /**
   * What the choice looks like, shown full-bleed at the top of the card. A
   * colour choice should show the colour; anything else should show the thing
   * itself rather than a label for it.
   */
  preview?: ReactNode;
}

/**
 * A choice made by looking rather than by reading.
 *
 * For the handful of decisions where the options differ in appearance — a
 * banner's colour, a layout — a dropdown is the wrong control: it hides every
 * option but one behind a click, and then describes each in words when the
 * thing itself would say it faster. These are laid out as cards with the
 * option rendered inside, so the choice is made by looking at it.
 *
 * Reserved for small sets that are worth the space. Anything longer than about
 * six options, or where the options only differ by name, belongs in
 * `OptionSelect`.
 */
export const ChoiceCards = ({
  label,
  options,
  value,
  onChange,
  helperText,
  error,
  columns = 3,
}: {
  label: string;
  options: ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  error?: string;
  /** Cards per row on a wide screen. Always one column on a phone. */
  columns?: number;
}): JSX.Element => {
  const selected = options.find((option) => option.value === value);
  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 1,
          mb: 1.5,
        }}
      >
        <Typography component="span" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
          {label}
        </Typography>
        {selected && (
          <Typography
            role="status"
            component="span"
            sx={{ color: tokenVar('accentText'), fontSize: '0.7rem', fontWeight: 700 }}
          >
            {selected.label} selected
          </Typography>
        )}
      </Box>
      <Box
        role="radiogroup"
        aria-label={label}
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: `repeat(${Math.min(columns, 2)}, minmax(0, 1fr))`,
            md: `repeat(${columns}, minmax(0, 1fr))`,
          },
          gap: 1.5,
        }}
      >
        {options.map((option) => (
          <ChoiceCard
            key={option.value}
            option={option}
            selected={option.value === value}
            onSelect={() => onChange(option.value)}
          />
        ))}
      </Box>
      {(error ?? helperText) && (
        <FormHelperText error={Boolean(error)} sx={{ mt: 1, mx: 0 }}>
          {error ?? helperText}
        </FormHelperText>
      )}
    </Box>
  );
};

const ChoiceCard = ({
  option,
  selected,
  onSelect,
}: {
  option: ChoiceOption;
  selected: boolean;
  onSelect: () => void;
}): JSX.Element => (
  <ButtonBase
    role="radio"
    aria-checked={selected}
    onClick={onSelect}
    // The skin's selectable card: Classic's paper with a divider or primary
    // edge and a lift when chosen; raised, then pressed in, in the tactile skins.
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      textAlign: 'left',
      minWidth: 0,
      overflow: 'hidden',
      borderRadius: 3,
      border: 2,
      color: 'text.primary',
      transition: (theme) => theme.transitions.create(['border-color', 'box-shadow']),
      ...choiceSx(selected),
    }}
  >
    {option.preview && (
      <Box aria-hidden sx={{ width: '100%', height: 64, overflow: 'hidden', flexShrink: 0 }}>
        {option.preview}
      </Box>
    )}
    <Box sx={{ p: 1.75, width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {option.icon && (
          <Box
            aria-hidden
            sx={{ display: 'flex', color: tokenVar('accentText'), '& svg': { fontSize: 19 } }}
          >
            {option.icon}
          </Box>
        )}
        <Typography component="span" sx={{ fontWeight: 700, fontSize: '0.85rem', flex: 1 }}>
          {option.label}
        </Typography>
        {selected && <CheckRoundedIcon sx={{ fontSize: 18, color: tokenVar('accentText') }} />}
      </Box>
      {option.description && (
        <Typography
          component="span"
          sx={{
            display: 'block',
            mt: 0.5,
            color: 'text.secondary',
            fontSize: '0.75rem',
            lineHeight: 1.5,
          }}
        >
          {option.description}
        </Typography>
      )}
    </Box>
  </ButtonBase>
);
