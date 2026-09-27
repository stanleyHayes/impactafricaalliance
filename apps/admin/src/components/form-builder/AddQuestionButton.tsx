import type { FormFieldType } from '@iaa/shared';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';

import { FORM_FIELD_TYPE_OPTIONS } from '../../lib/select-options';

/**
 * "Add a question": a menu of every question type with a line on what each
 * one is for, so the choice is made by what the applicant will do rather
 * than by a type name.
 */
export const AddQuestionButton = ({
  onAdd,
  disabled,
  stepTitle,
}: {
  onAdd: (type: FormFieldType) => void;
  disabled?: boolean;
  /** Names the step in the button's accessible name, since every step has one. */
  stepTitle: string;
}): JSX.Element => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  return (
    <>
      <Button
        variant="outlined"
        startIcon={<AddRoundedIcon />}
        onClick={(event) => setAnchor(event.currentTarget)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={Boolean(anchor)}
        aria-label={`Add a question to ${stepTitle || 'this step'}`}
      >
        Add a question
      </Button>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{
          paper: { sx: { maxHeight: 420, width: 340, maxWidth: 'calc(100vw - 32px)' } },
        }}
      >
        {FORM_FIELD_TYPE_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => {
              setAnchor(null);
              onAdd(option.value as FormFieldType);
            }}
            sx={{ alignItems: 'flex-start', whiteSpace: 'normal', py: 1 }}
          >
            <ListItemIcon sx={{ mt: 0.25 }}>{option.icon}</ListItemIcon>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{option.label}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                {option.description}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
