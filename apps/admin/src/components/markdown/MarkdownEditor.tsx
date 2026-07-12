import CodeIcon from '@mui/icons-material/Code';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import LinkIcon from '@mui/icons-material/Link';
import TitleIcon from '@mui/icons-material/Title';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useRef, useState } from 'react';

import { AiAssistButton } from '../ai/AiAssistButton';

import { Markdown } from './Markdown';

interface MarkdownEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  minRows?: number;
}

/** A markdown rich-text editor: formatting toolbar + a write/preview switch. */
export const MarkdownEditor = ({
  label,
  value,
  onChange,
  error,
  minRows = 10,
}: MarkdownEditorProps): JSX.Element => {
  const theme = useTheme();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<'write' | 'preview'>('write');

  const restore = (start: number, end: number): void => {
    requestAnimationFrame(() => {
      const ta = ref.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(start, end);
      }
    });
  };

  /** Wrap the current selection (or a placeholder) with markdown delimiters. */
  const wrap = (before: string, after: string, placeholder: string): void => {
    const ta = ref.current;
    if (!ta) {
      return;
    }
    const { selectionStart: start, selectionEnd: end } = ta;
    const selected = value.slice(start, end) || placeholder;
    onChange(value.slice(0, start) + before + selected + after + value.slice(end));
    restore(start + before.length, start + before.length + selected.length);
  };

  /** Prefix every line touched by the selection (lists, quotes, headings). */
  const prefixLines = (prefix: string): void => {
    const ta = ref.current;
    if (!ta) {
      return;
    }
    const { selectionStart: start, selectionEnd: end } = ta;
    const from = value.lastIndexOf('\n', start - 1) + 1;
    const toIndex = value.indexOf('\n', end);
    const to = toIndex === -1 ? value.length : toIndex;
    const block = value
      .slice(from, to)
      .split('\n')
      .map((line) => (line.length > 0 ? prefix + line : line))
      .join('\n');
    onChange(value.slice(0, from) + block + value.slice(to));
    restore(from, from + block.length);
  };

  const tools = [
    { key: 'bold', title: 'Bold', icon: <FormatBoldIcon fontSize="small" />, run: () => wrap('**', '**', 'bold text') },
    { key: 'italic', title: 'Italic', icon: <FormatItalicIcon fontSize="small" />, run: () => wrap('_', '_', 'italic text') },
    { key: 'heading', title: 'Heading', icon: <TitleIcon fontSize="small" />, run: () => prefixLines('## ') },
    { key: 'quote', title: 'Quote', icon: <FormatQuoteIcon fontSize="small" />, run: () => prefixLines('> ') },
    { key: 'code', title: 'Inline code', icon: <CodeIcon fontSize="small" />, run: () => wrap('`', '`', 'code') },
    { key: 'link', title: 'Link', icon: <LinkIcon fontSize="small" />, run: () => wrap('[', '](https://)', 'link text') },
    { key: 'ul', title: 'Bulleted list', icon: <FormatListBulletedIcon fontSize="small" />, run: () => prefixLines('- ') },
    { key: 'ol', title: 'Numbered list', icon: <FormatListNumberedIcon fontSize="small" />, run: () => prefixLines('1. ') },
  ];

  const accent = error ? theme.palette.error.main : theme.palette.primary.main;
  const frameColor = error ? theme.palette.error.main : theme.palette.divider;

  return (
    <Box>
      {label && (
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, mb: 0.75, color: error ? 'error.main' : 'text.secondary' }}
        >
          {label}
        </Typography>
      )}
      <Box
        sx={{
          border: `1px solid ${frameColor}`,
          borderRadius: 2,
          overflow: 'hidden',
          transition: theme.transitions.create(['border-color', 'box-shadow']),
          '&:focus-within': {
            borderColor: accent,
            boxShadow: `0 0 0 2px ${alpha(accent, 0.16)}`,
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 1,
            py: 0.5,
            gap: 0.5,
            flexWrap: 'wrap',
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.primary.main, 0.03),
          }}
        >
          <Stack direction="row" sx={{ visibility: mode === 'write' ? 'visible' : 'hidden' }}>
            {tools.map((tool) => (
              <Tooltip key={tool.key} title={tool.title}>
                <IconButton
                  size="small"
                  onClick={tool.run}
                  aria-label={tool.title}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                >
                  {tool.icon}
                </IconButton>
              </Tooltip>
            ))}
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <AiAssistButton value={value} onChange={onChange} />
            <ToggleButtonGroup
              size="small"
              exclusive
              value={mode}
              onChange={(_event, next) => next && setMode(next as 'write' | 'preview')}
              sx={{
                '& .MuiToggleButton-root': {
                  px: 1.5,
                  py: 0.25,
                  border: 'none',
                  textTransform: 'none',
                  fontWeight: 600,
                  color: 'text.secondary',
                  '&.Mui-selected': { color: 'text.primary', bgcolor: alpha(theme.palette.primary.main, 0.1) },
                },
              }}
            >
              <ToggleButton value="write">Write</ToggleButton>
              <ToggleButton value="preview">Preview</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>

        {mode === 'write' ? (
          <InputBase
            inputRef={ref}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            multiline
            minRows={minRows}
            fullWidth
            placeholder="Write in markdown…"
            sx={{
              display: 'block',
              p: 1.75,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.875rem',
              lineHeight: 1.7,
              bgcolor: 'background.paper',
            }}
          />
        ) : (
          <Box sx={{ p: 1.75, minHeight: minRows * 22, maxHeight: 540, overflowY: 'auto' }}>
            {value.trim() ? (
              <Markdown>{value}</Markdown>
            ) : (
              <Typography variant="body2" color="text.disabled">
                Nothing to preview yet.
              </Typography>
            )}
          </Box>
        )}
      </Box>
      <Typography
        variant="caption"
        sx={{ display: 'block', mt: 0.5, px: 0.5, color: error ? 'error.main' : 'text.secondary' }}
      >
        {error ?? 'Markdown supported — **bold**, _italic_, lists, > quotes, `code`, [links](url).'}
      </Typography>
    </Box>
  );
};
