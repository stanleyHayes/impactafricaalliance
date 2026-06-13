import { zodResolver } from '@hookform/resolvers/zod';
import { SubmissionType, contactSubmissionSchema, type ContactSubmissionInput } from '@iaa/shared';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useForm } from 'react-hook-form';

import { useSubmitForm } from '../../lib/mutations';

import { SubmitFeedback } from './SubmitFeedback';

/** General contact form (Contact page). */
export const ContactForm = (): JSX.Element => {
  const submit = useSubmitForm();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactSubmissionInput>({
    resolver: zodResolver(contactSubmissionSchema),
    defaultValues: { type: SubmissionType.Contact },
  });

  const onSubmit = handleSubmit((values) =>
    submit.mutate(values, { onSuccess: () => reset({ type: SubmissionType.Contact }) }),
  );

  return (
    <Stack component="form" spacing={2} onSubmit={onSubmit} noValidate>
      <TextField
        label="Full name"
        error={Boolean(errors.name)}
        helperText={errors.name?.message}
        {...register('name')}
      />
      <TextField
        label="Email address"
        type="email"
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
        {...register('email')}
      />
      <TextField
        label="Subject"
        error={Boolean(errors.subject)}
        helperText={errors.subject?.message}
        {...register('subject')}
      />
      <TextField
        label="Message"
        multiline
        minRows={5}
        error={Boolean(errors.message)}
        helperText={errors.message?.message}
        {...register('message')}
      />
      <SubmitFeedback
        isSuccess={submit.isSuccess}
        isError={submit.isError}
        successMessage="Thank you for reaching out! A member of the IAA team will respond within 2 business days."
      />
      <Button
        type="submit"
        variant="contained"
        disabled={submit.isPending}
        sx={{ alignSelf: 'flex-start' }}
      >
        {submit.isPending ? 'Sending…' : 'Send Message'}
      </Button>
    </Stack>
  );
};
