import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export interface SelectChoice {
  value: string;
  label: string;
  /** One line on what this option means, shown under the label in the menu. */
  description?: string;
  icon?: ReactNode;
  /** A colour chip shown before the label — for options that are a colour. */
  swatch?: string;
}

const Leading = ({ option }: { option: SelectChoice }): JSX.Element | null => {
  if (option.swatch)
    return (
      <Box
        aria-hidden
        sx={{
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: '50%',
          bgcolor: option.swatch,
          border: 1,
          borderColor: 'divider',
        }}
      />
    );
  if (option.icon)
    return (
      <Box
        aria-hidden
        sx={{ display: 'flex', color: 'text.secondary', '& svg': { fontSize: 19 } }}
      >
        {option.icon}
      </Box>
    );
  return null;
};

/**
 * A dropdown whose options explain themselves.
 *
 * The plain version listed bare words — "announcement", "success" — and left
 * the reader to work out what each would do. Every option here carries a
 * title, and an icon or colour and a line of description wherever there is
 * something worth saying, so the menu answers the question it raises.
 *
 * The field chrome stays MUI's outlined input so it lines up with the text
 * fields beside it; only the menu contents are ours.
 */
export const OptionSelect = ({
  label,
  options,
  value,
  onChange,
  helperText,
  error,
  disabled,
  placeholder = 'Select an option',
  size,
  fullWidth = true,
  sx,
}: {
  label?: string;
  options: SelectChoice[];
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  sx?: React.ComponentProps<typeof TextField>['sx'];
}): JSX.Element => (
  <TextField
    select
    fullWidth={fullWidth}
    size={size}
    label={label}
    value={value}
    disabled={disabled}
    onChange={(event) => onChange(event.target.value)}
    error={Boolean(error)}
    helperText={error ?? helperText}
    sx={sx}
    slotProps={{
      select: {
        displayEmpty: true,
        // Without this the closed field would show the description too, which
        // is menu detail, not a value.
        renderValue: (selected) => {
          const option = options.find((candidate) => candidate.value === selected);
          if (!option)
            return (
              <Typography component="span" sx={{ color: 'text.secondary' }}>
                {placeholder}
              </Typography>
            );
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
              <Leading option={option} />
              <Typography component="span" sx={{ fontWeight: 600, minWidth: 0 }} noWrap>
                {option.label}
              </Typography>
            </Box>
          );
        },
        MenuProps: {
          slotProps: {
            paper: {
              sx: {
                mt: 0.75,
                borderRadius: 3,
                border: 1,
                borderColor: 'divider',
                maxHeight: 380,
                '& .MuiList-root': { py: 0.75 },
              },
            },
          },
        },
      },
    }}
  >
    {options.map((option) => (
      <MenuItem
        key={option.value}
        value={option.value}
        sx={{
          alignItems: 'flex-start',
          gap: 1.25,
          py: 1.1,
          px: 1.5,
          mx: 0.75,
          borderRadius: 2,
          whiteSpace: 'normal',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 22, flexShrink: 0 }}>
          <Leading option={option} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="span" sx={{ display: 'block', fontWeight: 600, fontSize: '0.85rem' }}>
            {option.label}
          </Typography>
          {option.description && (
            <Typography
              component="span"
              sx={{
                display: 'block',
                mt: 0.25,
                color: 'text.secondary',
                fontSize: '0.73rem',
                lineHeight: 1.45,
              }}
            >
              {option.description}
            </Typography>
          )}
        </Box>
        {option.value === value && (
          <CheckRoundedIcon sx={{ fontSize: 17, color: 'primary.main', mt: 0.25, flexShrink: 0 }} />
        )}
      </MenuItem>
    ))}
  </TextField>
);
