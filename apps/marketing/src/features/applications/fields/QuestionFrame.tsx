import type { FormField } from '@iaa/shared';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { QUESTION_SX, VISUALLY_HIDDEN } from '../styles';

import { isRequiredField, type FieldIds } from './field-props';

/**
 * How a question names its answer.
 *
 * - `label`: one input, named by a `<label>`.
 * - `legend`: a group of options (or an upload), named by a fieldset legend.
 * - `none`: a single tick-box whose own label is the question.
 */
export type FrameKind = 'label' | 'legend' | 'none';

interface QuestionFrameProps {
  field: FormField;
  frame: FrameKind;
  ids: FieldIds;
  error: string | undefined;
  children: ReactNode;
}

/** The asterisk sighted readers see, and words for everyone else where no `required` attribute says it. */
export const RequiredMark = ({ spoken }: { spoken: boolean }): JSX.Element => (
  <>
    <Box component="span" aria-hidden="true" sx={{ ml: 0.5, color: 'text.secondary' }}>
      *
    </Box>
    {spoken && (
      <Box component="span" sx={VISUALLY_HIDDEN}>
        {' '}
        (required)
      </Box>
    )}
  </>
);

/** The error under a question: an icon and a sentence, never colour alone. */
export const FieldError = ({ id, message }: { id: string; message: string }): JSX.Element => (
  <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 1, color: 'error.main' }}>
    <ErrorRoundedIcon aria-hidden="true" fontSize="small" sx={{ mt: '3px' }} />
    <Typography id={id} sx={{ color: 'error.main', fontWeight: 600, lineHeight: 1.5 }}>
      {message}
    </Typography>
  </Stack>
);

const HelpText = ({ id, text }: { id: string; text: string }): JSX.Element => (
  <Typography id={id} sx={{ mt: 0.75, color: 'text.secondary', fontSize: '1rem', lineHeight: 1.6 }}>
    {text}
  </Typography>
);

/**
 * The frame around every question: its label or legend with the required
 * mark, help text, the error when there is one, then the answer itself.
 */
export const QuestionFrame = ({
  field,
  frame,
  ids,
  error,
  children,
}: QuestionFrameProps): JSX.Element => {
  const required = isRequiredField(field);
  const help = field.helpText ? <HelpText id={ids.help} text={field.helpText} /> : null;
  const errorLine = error ? <FieldError id={ids.error} message={error} /> : null;

  if (frame === 'none') {
    return (
      <Box>
        {children}
        {help}
        {errorLine}
      </Box>
    );
  }

  const name = (
    <>
      {field.label}
      {required && <RequiredMark spoken={frame === 'legend'} />}
    </>
  );

  return (
    <Box
      component={frame === 'legend' ? 'fieldset' : 'div'}
      aria-describedby={frame === 'legend' ? ids.describedBy : undefined}
      sx={{ m: 0, p: 0, border: 0, minWidth: 0 }}
    >
      {frame === 'legend' ? (
        <Typography component="legend" id={ids.label} sx={{ ...QUESTION_SX, p: 0 }}>
          {name}
        </Typography>
      ) : (
        <Typography component="label" htmlFor={ids.input} id={ids.label} sx={QUESTION_SX}>
          {name}
        </Typography>
      )}
      {help}
      {errorLine}
      <Box sx={{ mt: 1.5 }}>{children}</Box>
    </Box>
  );
};
