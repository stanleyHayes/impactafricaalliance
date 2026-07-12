import { zodResolver } from '@hookform/resolvers/zod';
import {
  SubmissionType,
  volunteerSubmissionSchema,
  type VolunteerSubmissionInput,
} from '@iaa/shared';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useForm, type Resolver } from 'react-hook-form';

import { ConsentCheckbox } from '../../components/ConsentCheckbox';
import { useSubmitForm } from '../../lib/mutations';

import { SubmitFeedback } from './SubmitFeedback';

/** Volunteer / mentor application form (Get Involved → Volunteer). */
export const VolunteerForm = (): JSX.Element => {
  const submit = useSubmitForm();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VolunteerSubmissionInput>({
    resolver: zodResolver(volunteerSubmissionSchema) as Resolver<VolunteerSubmissionInput>,
    defaultValues: { type: SubmissionType.Volunteer, consent: false },
  });

  const onSubmit = handleSubmit((values) =>
    submit.mutate(values, { onSuccess: () => reset({ type: SubmissionType.Volunteer, consent: false }) }),
  );

  return (
    <Stack component="form" spacing={2} onSubmit={onSubmit} noValidate>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Full name"
            fullWidth
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            {...register('name')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Email"
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
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Area of expertise"
            fullWidth
            error={Boolean(errors.expertise)}
            helperText={errors.expertise?.message}
            {...register('expertise')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Availability (hours / month)"
            type="number"
            fullWidth
            error={Boolean(errors.availabilityHoursPerMonth)}
            helperText={errors.availabilityHoursPerMonth?.message}
            {...register('availabilityHoursPerMonth')}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="How you want to contribute"
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
        successMessage="Thank you for offering your time! We'll reach out about matching opportunities."
      />
      <Button
        type="submit"
        variant="contained"
        disabled={submit.isPending}
        sx={{ alignSelf: 'flex-start' }}
      >
        {submit.isPending ? 'Submitting…' : 'Apply to Volunteer'}
      </Button>
    </Stack>
  );
};
