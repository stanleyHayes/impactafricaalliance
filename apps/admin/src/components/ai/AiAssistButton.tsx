import { AI_ASSIST_ACTIONS, type AiAssistAction } from '@iaa/shared';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useRef, useState } from 'react';

import { useAiAssist } from '../../lib/admin-hooks';

const ACTION_LABELS: Record<AiAssistAction, string> = {
  improve: 'Improve writing',
  formalize: 'Make more formal',
  shorten: 'Shorten',
  expand: 'Expand',
  summarize: 'Summarize',
  'fix-grammar': 'Fix spelling & grammar',
  simplify: 'Simplify',
};

interface AiAssistButtonProps {
  value: string;
  onChange: (next: string) => void;
  size?: 'small' | 'medium';
}

/** A ✨ button that rewrites the bound field's text via the Claude writing assistant. */
export const AiAssistButton = ({ value, onChange, size = 'small' }: AiAssistButtonProps): JSX.Element => {
  const assist = useAiAssist();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [result, setResult] = useState('');

  const hasText = value.trim().length > 0;

  const run = (action: AiAssistAction): void => {
    setMenuOpen(false);
    setResult('');
    setResultOpen(true);
    assist.reset();
    assist.mutate({ text: value, action }, { onSuccess: (res) => setResult(res.result) });
  };

  const closeResult = (): void => {
    setResultOpen(false);
    setResult('');
    assist.reset();
  };

  const apply = (): void => {
    onChange(result);
    closeResult();
  };

  return (
    <>
      <Tooltip title={hasText ? 'AI writing assistant' : 'Add some text first'}>
        <span>
          <IconButton
            ref={anchorRef}
            size={size}
            disabled={!hasText}
            onClick={() => setMenuOpen(true)}
            aria-label="AI writing assistant"
            sx={{
              color: 'secondary.main',
              '&:hover': { bgcolor: (t) => alpha(t.palette.secondary.main, 0.12) },
            }}
          >
            <AutoAwesomeIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Menu
        anchorEl={anchorRef.current}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 0.5, minWidth: 210, borderRadius: 2 } } }}
      >
        <Typography
          variant="overline"
          sx={{ display: 'block', px: 2, pt: 0.5, color: 'text.secondary', fontWeight: 700 }}
        >
          AI assist
        </Typography>
        {AI_ASSIST_ACTIONS.map((action) => (
          <MenuItem key={action} onClick={() => run(action)} sx={{ py: 0.75 }}>
            <ListItemText slotProps={{ primary: { fontSize: '0.875rem' } }}>
              {ACTION_LABELS[action]}
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>

      <Popover
        open={resultOpen}
        anchorEl={anchorRef.current}
        onClose={closeResult}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, width: 440, maxWidth: '92vw', borderRadius: 2.5 } } }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <AutoAwesomeIcon fontSize="small" sx={{ color: 'secondary.main' }} />
            <Typography sx={{ fontWeight: 700 }}>AI suggestion</Typography>
          </Stack>

          {assist.isPending && (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 3 }}>
              <CircularProgress size={26} />
              <Typography variant="body2" color="text.secondary">
                Rewriting…
              </Typography>
            </Stack>
          )}

          {assist.isError && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {assist.error.message}
            </Alert>
          )}

          {!assist.isPending && !assist.isError && (
            <>
              <Box
                sx={{
                  maxHeight: 280,
                  overflowY: 'auto',
                  p: 1.5,
                  bgcolor: 'background.default',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                }}
              >
                {result}
              </Box>
              <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.5 }}>
                <Button size="small" onClick={closeResult}>
                  Discard
                </Button>
                <Button size="small" variant="contained" onClick={apply} disabled={!result}>
                  Replace text
                </Button>
              </Stack>
            </>
          )}
        </Box>
      </Popover>
    </>
  );
};
