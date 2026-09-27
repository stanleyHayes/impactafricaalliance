import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';

import { VISUALLY_HIDDEN, optionCardSx } from '../styles';

import { isRequiredField, type FieldProps } from './field-props';
import { RequiredMark } from './QuestionFrame';

/**
 * A single tick-box whose label is the question itself, shown as one option
 * card so it is as easy to tap as the choices around it.
 */
export const CheckboxAnswer = ({ field, value, error, ids, onChange }: FieldProps): JSX.Element => {
  const checked = value === true;
  return (
    <FormControlLabel
      control={
        <Checkbox
          id={ids.input}
          checked={checked}
          onChange={(_event, isChecked) => onChange(isChecked)}
          slotProps={{
            input: {
              'aria-describedby': ids.describedBy,
              'aria-invalid': Boolean(error) || undefined,
            },
          }}
        />
      }
      label={
        <>
          {field.label}
          {field.required && <RequiredMark spoken />}
        </>
      }
      sx={optionCardSx(checked, Boolean(error))}
    />
  );
};

/**
 * Consent: the words being agreed to, a tick-box, and the privacy policy.
 * The policy opens in a new tab so reading it never costs the applicant
 * their place, and the link sits outside the label so following it does not
 * tick the box.
 */
export const ConsentAnswer = ({ field, value, error, ids, onChange }: FieldProps): JSX.Element => {
  const checked = value === true;
  return (
    <>
      <FormControlLabel
        control={
          <Checkbox
            id={ids.input}
            checked={checked}
            onChange={(_event, isChecked) => onChange(isChecked)}
            // On the input rather than the control: FormControlLabel would
            // otherwise add a second asterisk after the consent wording.
            slotProps={{
              input: {
                required: isRequiredField(field),
                'aria-invalid': Boolean(error) || undefined,
              },
            }}
          />
        }
        label={field.consentText ?? 'I agree'}
        sx={[optionCardSx(checked, Boolean(error)), { alignItems: 'flex-start' }]}
      />
      <Box sx={{ mt: 1.25 }}>
        <Link
          component={RouterLink}
          to="/privacy-policy"
          target="_blank"
          rel="noopener"
          sx={{ fontWeight: 600 }}
        >
          Read our privacy policy
          <Box component="span" sx={VISUALLY_HIDDEN}>
            {' '}
            (opens in a new tab)
          </Box>
        </Link>
      </Box>
    </>
  );
};
