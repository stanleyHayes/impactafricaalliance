import { EVENT_QUESTION_TYPES, type EventQuestion, type EventQuestionType } from '@iaa/shared';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

const TYPE_LABELS: Record<EventQuestionType, string> = {
  'short-text': 'Short answer',
  'long-text': 'Long answer',
  'single-choice': 'Choose one',
  'multi-choice': 'Choose many',
  date: 'Date',
};

const CHOICE_TYPES: EventQuestionType[] = ['single-choice', 'multi-choice'];

const newQuestionId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : `q${String(Date.now()).slice(-8)}`;

interface QuestionBuilderProps {
  label: string;
  value: EventQuestion[];
  onChange: (next: EventQuestion[]) => void;
  helperText?: string;
}

/**
 * Editor for an event's own questions. These sit after the core audience
 * questions every event asks, so an event can gather what only it needs.
 */
export const QuestionBuilder = ({
  label,
  value,
  onChange,
  helperText,
}: QuestionBuilderProps): JSX.Element => {
  const questions = Array.isArray(value) ? value : [];

  const update = (index: number, patch: Partial<EventQuestion>): void => {
    onChange(questions.map((question, i) => (i === index ? { ...question, ...patch } : question)));
  };

  const move = (index: number, delta: number): void => {
    const target = index + delta;
    if (target < 0 || target >= questions.length) {
      return;
    }
    const next = [...questions];
    const [moved] = next.splice(index, 1);
    if (moved) {
      next.splice(target, 0, moved);
    }
    onChange(next);
  };

  const add = (): void => {
    onChange([
      ...questions,
      {
        id: newQuestionId(),
        label: '',
        type: 'short-text',
        options: [],
        required: false,
        helpText: undefined,
      },
    ]);
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 700 }}>
        {label}
      </Typography>
      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          {helperText}
        </Typography>
      )}

      <Stack spacing={2}>
        {questions.map((question, index) => {
          const isChoice = CHOICE_TYPES.includes(question.type);
          return (
            <Paper
              key={question.id}
              elevation={0}
              sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  {String(index + 1).padStart(2, '0')}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Move up">
                  <span>
                    <IconButton size="small" onClick={() => move(index, -1)} disabled={index === 0}>
                      <ArrowUpwardRoundedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Move down">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => move(index, 1)}
                      disabled={index === questions.length - 1}
                    >
                      <ArrowDownwardRoundedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Remove question">
                  <IconButton
                    size="small"
                    onClick={() => onChange(questions.filter((_, i) => i !== index))}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Stack spacing={2}>
                <TextField
                  label="Question"
                  fullWidth
                  value={question.label}
                  onChange={(event) => update(index, { label: event.target.value })}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    select
                    label="Answer type"
                    fullWidth
                    value={question.type}
                    onChange={(event) =>
                      update(index, { type: event.target.value as EventQuestionType })
                    }
                  >
                    {EVENT_QUESTION_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </MenuItem>
                    ))}
                  </TextField>
                  <FormControlLabel
                    sx={{ flexShrink: 0 }}
                    control={
                      <Switch
                        checked={question.required}
                        onChange={(_event, checked) => update(index, { required: checked })}
                      />
                    }
                    label="Required"
                  />
                </Stack>
                {isChoice && (
                  <TextField
                    label="Choices"
                    fullWidth
                    multiline
                    minRows={3}
                    value={(question.options ?? []).join('\n')}
                    onChange={(event) =>
                      update(index, {
                        options: event.target.value
                          .split('\n')
                          .map((option) => option.trim())
                          .filter(Boolean),
                      })
                    }
                    helperText="One choice per line."
                  />
                )}
                <TextField
                  label="Help text (optional)"
                  fullWidth
                  value={question.helpText ?? ''}
                  onChange={(event) => update(index, { helpText: event.target.value })}
                />
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      <Button startIcon={<AddRoundedIcon />} onClick={add} sx={{ mt: questions.length ? 2 : 0 }}>
        Add question
      </Button>
    </Box>
  );
};
