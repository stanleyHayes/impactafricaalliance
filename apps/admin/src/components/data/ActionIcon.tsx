import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import type { ReactNode } from 'react';

/** Compact actions keep their accessible names, including when disabled. */
export const ActionIcon = ({
  label,
  children,
  onClick,
  disabled = false,
  color = 'default',
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  color?: 'default' | 'error' | 'success';
}): JSX.Element => (
  <Tooltip title={label}>
    <span>
      <IconButton
        size="small"
        aria-label={label}
        disabled={disabled}
        color={color}
        onClick={onClick}
      >
        {children}
      </IconButton>
    </span>
  </Tooltip>
);
