import { zodResolver } from '@hookform/resolvers/zod';
import { SubmissionType, contactSubmissionSchema, type ContactSubmissionInput } from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm } from 'react-hook-form';

import { ConsentCheckbox } from '../../components/ConsentCheckbox';
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
    defaultValues: { type: SubmissionType.Contact, consent: false },
  });

  const onSubmit = handleSubmit((values) =>
    submit.mutate(values, { onSuccess: () => reset({ type: SubmissionType.Contact, consent: false }) }),
  );

  return (
    <Stack component="form" spacing={3} onSubmit={onSubmit} noValidate>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Full name"
            placeholder="Your name"
            fullWidth
            autoComplete="name"
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            {...register('name')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Email address"
            placeholder="you@example.com"
            type="email"
            fullWidth
            autoComplete="email"
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
            {...register('email')}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Subject"
            placeholder="What would you like to discuss?"
            fullWidth
            error={Boolean(errors.subject)}
            helperText={errors.subject?.message}
            {...register('subject')}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Message"
            placeholder="Tell us how we can help..."
            fullWidth
            multiline
            minRows={6}
            error={Boolean(errors.message)}
            helperText={errors.message?.message}
            {...register('message')}
          />
        </Grid>
        <Grid size={12}>
          <ConsentCheckbox register={register('consent')} error={errors.consent?.message} />
        </Grid>
      </Grid>

      <SubmitFeedback
        isSuccess={submit.isSuccess}
        isError={submit.isError}
        successMessage="Thank you for reaching out! A member of the IAA team will respond within 2 business days."
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={0.8} alignItems="center">
          <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
          <Typography variant="caption" color="text.secondary">
            Your details are used only to respond to this enquiry.
          </Typography>
        </Stack>
        <Box sx={{ flexShrink: 0 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={submit.isPending}
            endIcon={<ArrowForwardRoundedIcon />}
            sx={{ minWidth: 170, fontWeight: 700 }}
          >
            {submit.isPending ? 'Sending…' : 'Send message'}
          </Button>
        </Box>
      </Stack>
    </Stack>
  );
};
