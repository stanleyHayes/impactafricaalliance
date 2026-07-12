import { zodResolver } from '@hookform/resolvers/zod';
import { SubmissionType, partnerSubmissionSchema, type PartnerSubmissionInput } from '@iaa/shared';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useForm } from 'react-hook-form';

import { ConsentCheckbox } from '../../components/ConsentCheckbox';
import { useSubmitForm } from '../../lib/mutations';

import { SubmitFeedback } from './SubmitFeedback';

/** Partner-with-us inquiry form (Get Involved → Partner). */
export const PartnerForm = (): JSX.Element => {
  const submit = useSubmitForm();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartnerSubmissionInput>({
    resolver: zodResolver(partnerSubmissionSchema),
    defaultValues: { type: SubmissionType.Partner, consent: false },
  });

  const onSubmit = handleSubmit((values) =>
    submit.mutate(values, { onSuccess: () => reset({ type: SubmissionType.Partner, consent: false }) }),
  );

  return (
    <Stack component="form" spacing={2} onSubmit={onSubmit} noValidate>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Organization name"
            fullWidth
            error={Boolean(errors.organizationName)}
            helperText={errors.organizationName?.message}
            {...register('organizationName')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Contact name"
            fullWidth
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            {...register('name')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Email address"
            type="email"
            fullWidth
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
            {...register('email')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Country"
            fullWidth
            error={Boolean(errors.country)}
            helperText={errors.country?.message}
            {...register('country')}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Type of partnership interest"
            fullWidth
            error={Boolean(errors.partnershipInterest)}
            helperText={errors.partnershipInterest?.message}
            {...register('partnershipInterest')}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Message"
            fullWidth
            multiline
            minRows={4}
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
        successMessage="Thank you! A member of the IAA team will be in touch shortly."
      />
      <Button
        type="submit"
        variant="contained"
        disabled={submit.isPending}
        sx={{ alignSelf: 'flex-start' }}
      >
        {submit.isPending ? 'Submitting…' : 'Submit Partnership Inquiry'}
      </Button>
    </Stack>
  );
};
