import Alert from '@mui/material/Alert';

interface SubmitFeedbackProps {
  isSuccess: boolean;
  isError: boolean;
  successMessage: string;
}

/** Inline success/error banner shared by every public form. */
export const SubmitFeedback = ({
  isSuccess,
  isError,
  successMessage,
}: SubmitFeedbackProps): JSX.Element | null => {
  if (isSuccess) {
    return <Alert severity="success">{successMessage}</Alert>;
  }
  if (isError) {
    return <Alert severity="error">Something went wrong. Please try again in a moment.</Alert>;
  }
  return null;
};
