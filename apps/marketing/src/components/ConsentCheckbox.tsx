import CheckBoxOutlineBlankRoundedIcon from '@mui/icons-material/CheckBoxOutlineBlankRounded';
import CheckBoxRoundedIcon from '@mui/icons-material/CheckBoxRounded';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';

interface ConsentCheckboxProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  error?: string;
  label?: string;
}

/** Standard affirmative consent checkbox with a link to the privacy policy. */
export const ConsentCheckbox = ({
  register,
  error,
  label = 'I agree to the processing of my personal data as described in the',
}: ConsentCheckboxProps): JSX.Element => (
  <>
    <FormControlLabel
      control={
        <Checkbox
          {...register}
          icon={<CheckBoxOutlineBlankRoundedIcon />}
          checkedIcon={<CheckBoxRoundedIcon />}
          color="primary"
        />
      }
      label={
        <>
          {label}{' '}
          <Link component={RouterLink} to="/privacy-policy">
            Privacy Policy
          </Link>
          .
        </>
      }
    />
    {error && <FormHelperText error>{error}</FormHelperText>}
  </>
);
