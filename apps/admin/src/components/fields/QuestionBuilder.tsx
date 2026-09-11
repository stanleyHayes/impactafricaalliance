import { type EventQuestion, type EventQuestionType } from '@iaa/shared';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import QuestionAnswerOutlinedIcon from '@mui/icons-material/QuestionAnswerOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { QUESTION_TYPE_OPTIONS } from '../../lib/select-options';

import { OptionSelect } from './OptionSelect';

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

/** Keep line breaks while typing; send normalized choices to the form contract. */
const ChoicesField = ({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}): JSX.Element => {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  return (
    <TextField
      label="Choices"
      fullWidth
      multiline
      minRows={3}
      value={editing ? draft : options.join('\n')}
      onFocus={() => {
        setDraft(options.join('\n'));
        setEditing(true);
      }}
      onBlur={() => setEditing(false)}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(
          event.target.value
            .split('\n')
            .map((option) => option.trim())
            .filter(Boolean),
        );
      }}
      helperText="One choice per line. Attendees see them in this order."
    />
  );
};

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
      <Typography variant="h6" sx={{ mb: 0.75, fontWeight: 700 }}>
        {label}
      </Typography>
      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          {helperText}
        </Typography>
      )}

      {questions.length === 0 && (
        <Stack
          alignItems="center"
          spacing={1.5}
          sx={{
            p: 4,
            mb: 2,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
            textAlign: 'center',
          }}
        >
          <QuestionAnswerOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Make registration more useful
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '45ch' }}>
            Ask about interests, access needs, or anything that helps you prepare for your
            attendees.
          </Typography>
        </Stack>
      )}
      <Stack spacing={3}>
        {questions.map((question, index) => {
          const isChoice = CHOICE_TYPES.includes(question.type);
          return (
            <Paper
              key={question.id}
              elevation={0}
              sx={{
                p: { xs: 2, md: 3 },
                border: 1,
                borderColor: 'divider',
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  top: -16,
                  right: 90,
                  pointerEvents: 'none',
                  color: (theme) => alpha(theme.palette.text.primary, 0.045),
                  '& svg': { fontSize: 150 },
                }}
              >
                <QuestionAnswerOutlinedIcon />
              </Box>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 3, position: 'relative' }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 38,
                    height: 38,
                    borderRadius: 1.5,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
                    fontWeight: 800,
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2">Question {index + 1}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {TYPE_LABELS[question.type]}
                  </Typography>
                </Box>
                <Tooltip title="Move up">
                  <span>
                    <IconButton
                      aria-label={`Move question ${index + 1} up`}
                      size="small"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                    >
                      <ArrowUpwardRoundedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Move down">
                  <span>
                    <IconButton
                      size="small"
                      aria-label={`Move question ${index + 1} down`}
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
                    aria-label={`Remove question ${index + 1}`}
                    onClick={() => onChange(questions.filter((_, i) => i !== index))}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.25fr) minmax(0, 1fr)' },
                  gap: 3,
                  position: 'relative',
                }}
              >
                <Stack spacing={2.5}>
                  <TextField
                    label="Question"
                    fullWidth
                    value={question.label}
                    onChange={(event) => update(index, { label: event.target.value })}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <OptionSelect
                      label="Answer type"
                      options={QUESTION_TYPE_OPTIONS}
                      value={question.type}
                      onChange={(value: string) =>
                        update(index, { type: value as EventQuestionType })
                      }
                    />
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
                    <ChoicesField
                      options={question.options ?? []}
                      onChange={(options) => update(index, { options })}
                    />
                  )}
                  <TextField
                    label="Help text (optional)"
                    fullWidth
                    value={question.helpText ?? ''}
                    onChange={(event) => update(index, { helpText: event.target.value })}
                  />
                </Stack>
                <Stack
                  component="aside"
                  aria-label={`Preview question ${index + 1}`}
                  spacing={2}
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.055),
                    alignSelf: 'stretch',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <VisibilityOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Attendee preview
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                    {question.label || 'Your question appears here'}
                  </Typography>
                  <Chip
                    size="small"
                    label={question.required ? 'Required answer' : 'Optional answer'}
                    sx={{ alignSelf: 'flex-start' }}
                  />
                  {question.helpText && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ overflowWrap: 'anywhere' }}
                    >
                      {question.helpText}
                    </Typography>
                  )}
                  {isChoice ? (
                    <Stack spacing={1}>
                      {(question.options?.length ? question.options : ['Your answer choices']).map(
                        (option, optionIndex) => (
                          <Stack
                            key={optionIndex}
                            direction="row"
                            spacing={1.25}
                            alignItems="center"
                            sx={{
                              p: 1.25,
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 1.5,
                              bgcolor: 'background.paper',
                            }}
                          >
                            <Box
                              aria-hidden
                              sx={{
                                width: 16,
                                height: 16,
                                flexShrink: 0,
                                border: 1,
                                borderColor: 'text.disabled',
                                borderRadius: question.type === 'single-choice' ? '50%' : 0.5,
                              }}
                            />
                            <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                              {option}
                            </Typography>
                          </Stack>
                        ),
                      )}
                    </Stack>
                  ) : (
                    <Box
                      sx={{
                        p: 1.5,
                        minHeight: question.type === 'long-text' ? 100 : 48,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                        color: 'text.secondary',
                        fontSize: 14,
                      }}
                    >
                      {question.type === 'date' ? 'Day / Month / Year' : 'Your answer…'}
                    </Box>
                  )}
                </Stack>
              </Box>
            </Paper>
          );
        })}
      </Stack>

      <Button
        variant="outlined"
        startIcon={<AddRoundedIcon />}
        onClick={add}
        sx={{ mt: questions.length ? 2 : 0 }}
      >
        Add question
      </Button>
    </Box>
  );
};
