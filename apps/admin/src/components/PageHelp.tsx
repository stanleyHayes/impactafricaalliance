import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

export interface PageGuide {
  title: string;
  steps: string[];
}

interface PageHelpProps {
  guide: PageGuide;
}

/** Per-page help popover with optional text-to-speech for the guide steps. */
export const PageHelp = ({ guide }: PageHelpProps): JSX.Element => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);

  const speak = (): void => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const text = `${guide.title}. ${guide.steps.join('. ')}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <>
      <IconButton
        id="admin-page-help"
        size="small"
        aria-label={`About ${guide.title}`}
        aria-expanded={open}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{
          color: 'text.secondary',
          bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
          border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.12)}`,
          '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.12) },
        }}
      >
        <HelpOutlineRoundedIcon fontSize="small" />
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 320,
              p: 2,
              borderRadius: 2.5,
              border: (t) => `1px solid ${t.palette.divider}`,
              boxShadow: (t) => t.shadows[8],
            },
          },
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {guide.title}
            </Typography>
            <IconButton size="small" aria-label="Listen to guide" onClick={speak}>
              <VolumeUpRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
          <List dense disablePadding>
            {guide.steps.map((step, index) => (
              <ListItem key={index} disableGutters sx={{ py: 0.25, alignItems: 'flex-start' }}>
                <Typography
                  component="span"
                  sx={{
                    minWidth: 22,
                    fontWeight: 700,
                    color: 'text.primary',
                    fontSize: '0.8rem',
                  }}
                >
                  {index + 1}.
                </Typography>
                <ListItemText
                  primary={step}
                  slotProps={{ primary: { variant: 'body2', sx: { color: 'text.secondary' } } }}
                />
              </ListItem>
            ))}
          </List>
        </Stack>
      </Popover>
    </>
  );
};
