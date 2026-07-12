import { zodResolver } from '@hookform/resolvers/zod';
import {
  SubmissionType,
  jobSubmissionSchema,
  type JobSubmissionInput,
} from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { ConsentCheckbox } from '../components/ConsentCheckbox';
import { PageHero } from '../components/PageHero';
import { Seo } from '../components/Seo';
import { SubmitFeedback } from '../features/forms/SubmitFeedback';
import { signCvUpload, uploadCvToCloudinary } from '../lib/cloudinary';
import { useJob } from '../lib/content-hooks';
import { useSubmitForm } from '../lib/mutations';

const MAX_CV_SIZE = 5 * 1024 * 1024;
const ALLOWED_CV_TYPE = 'application/pdf';

const JobLoading = (): JSX.Element => (
  <>
    <Box sx={{ bgcolor: 'primary.dark', py: { xs: 8, md: 12 } }}>
      <Container>
        <Skeleton width={140} sx={{ bgcolor: 'rgba(255,255,255,0.16)' }} />
        <Skeleton width="78%" height={72} sx={{ mt: 3, bgcolor: 'rgba(255,255,255,0.16)' }} />
        <Skeleton width="40%" height={32} sx={{ bgcolor: 'rgba(255,255,255,0.12)' }} />
      </Container>
    </Box>
    <Container sx={{ py: { xs: 6, md: 10 } }}>
      <Skeleton height={24} />
      <Skeleton height={24} />
      <Skeleton height={24} width="92%" />
      <Skeleton height={48} sx={{ mt: 3 }} />
      <Skeleton height={48} />
    </Container>
  </>
);

const JobNotFound = (): JSX.Element => (
  <Container sx={{ py: { xs: 10, md: 16 }, textAlign: 'center' }}>
    <Typography
      variant="overline"
      sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: 1.5 }}
    >
      Careers
    </Typography>
    <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: '2rem', md: '2.8rem' } }}>
      Job not found
    </Typography>
    <Typography color="text.secondary" sx={{ mt: 2 }}>
      This position may have closed or the link may be incorrect.
    </Typography>
    <Button
      component={RouterLink}
      to="/get-involved#careers"
      variant="contained"
      startIcon={<ArrowBackRoundedIcon />}
      sx={{ mt: 4 }}
    >
      Back to careers
    </Button>
  </Container>
);

const formatJobType = (type: string): string =>
  type
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const validateCvFile = (file: File | null): string => {
  if (!file) return 'Please upload your CV.';
  if (file.type !== ALLOWED_CV_TYPE) return 'Please upload a PDF file.';
  if (file.size > MAX_CV_SIZE) return 'File is too large. Maximum size is 5 MB.';
  return '';
};

interface CvUploadFieldProps {
  cvFile: File | null;
  cvError: string;
  resumeError?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const CvUploadField = ({ cvFile, cvError, resumeError, onChange }: CvUploadFieldProps): JSX.Element => (
  <Box>
    <Button component="label" variant="outlined" startIcon={<DescriptionRoundedIcon />} sx={{ fontWeight: 700 }}>
      {cvFile ? 'Change CV' : 'Upload CV (PDF, max 5 MB)'}
      <input type="file" accept="application/pdf" hidden onChange={onChange} />
    </Button>
    {cvFile && (
      <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
        Selected: {cvFile.name} ({Math.round(cvFile.size / 1024)} KB)
      </Typography>
    )}
    {(cvError || resumeError) && (
      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75 }}>
        {cvError || resumeError}
      </Typography>
    )}
  </Box>
);

interface FormActionsProps {
  isPending: boolean;
  isSuccess: boolean;
}

const FormActions = ({ isPending, isSuccess }: FormActionsProps): JSX.Element => {
  if (isSuccess) {
    return (
      <Button
        component={RouterLink}
        to="/get-involved#careers"
        variant="contained"
        startIcon={<ArrowBackRoundedIcon />}
        sx={{ alignSelf: 'flex-start' }}
      >
        Back to careers
      </Button>
    );
  }

  return (
    <Button type="submit" variant="contained" disabled={isPending} sx={{ alignSelf: 'flex-start' }}>
      {isPending ? 'Submitting…' : 'Submit application'}
    </Button>
  );
};

interface JobApplicationFormProps {
  job: { title: string; slug: string };
}

const JobApplicationForm = ({ job }: JobApplicationFormProps): JSX.Element => {
  const submit = useSubmitForm();
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JobSubmissionInput>({
    resolver: zodResolver(jobSubmissionSchema),
    defaultValues: {
      type: SubmissionType.Job,
      jobSlug: job.slug,
      jobTitle: job.title,
      consent: false,
    },
  });

  const handleCvChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;
    const error = validateCvFile(file);
    setCvError(error);
    setCvFile(error ? null : file);
  };

  const onSubmit = handleSubmit(async (values) => {
    const error = validateCvFile(cvFile);
    if (error) {
      setCvError(error);
      return;
    }

    try {
      const signature = await signCvUpload();
      const upload = await uploadCvToCloudinary(cvFile!, signature);

      submit.mutate(
        {
          ...values,
          resumeUrl: upload.url,
          resumePublicId: upload.publicId,
        },
        {
          onSuccess: () => {
            setCvFile(null);
            reset({
              type: SubmissionType.Job,
              jobSlug: job.slug,
              jobTitle: job.title,
              consent: false,
            });
          },
        },
      );
    } catch (error) {
      setCvError(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    }
  });

  return (
    <Box
      sx={{
        p: { xs: 3, sm: 4, md: 5 },
        border: 1,
        borderColor: 'rgba(0,30,20,0.1)',
        borderRadius: 4,
        bgcolor: 'background.paper',
      }}
    >
      <Typography
        variant="overline"
        sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: 1.5 }}
      >
        Application
      </Typography>
      <Typography variant="h3" sx={{ mt: 1, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
        Apply for this role
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1.5, mb: 4 }}>
        Complete the form below and upload your CV. We review every application and will respond
        within two weeks.
      </Typography>

      <Stack component="form" spacing={2.5} onSubmit={onSubmit} noValidate>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Full name"
              placeholder="Your full name"
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
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Phone (optional)"
              placeholder="+233 20 000 0000"
              type="tel"
              fullWidth
              autoComplete="tel"
              error={Boolean(errors.phone)}
              helperText={errors.phone?.message}
              {...register('phone')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Country"
              placeholder="Your country"
              fullWidth
              error={Boolean(errors.country)}
              helperText={errors.country?.message}
              {...register('country')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="LinkedIn URL (optional)"
              placeholder="https://linkedin.com/in/..."
              type="url"
              fullWidth
              error={Boolean(errors.linkedInUrl)}
              helperText={errors.linkedInUrl?.message}
              {...register('linkedInUrl')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Portfolio URL (optional)"
              placeholder="https://..."
              type="url"
              fullWidth
              error={Boolean(errors.portfolioUrl)}
              helperText={errors.portfolioUrl?.message}
              {...register('portfolioUrl')}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label="Cover letter"
              placeholder="Tell us why you're a great fit for this role..."
              fullWidth
              multiline
              minRows={5}
              error={Boolean(errors.coverLetter)}
              helperText={errors.coverLetter?.message}
              {...register('coverLetter')}
            />
          </Grid>
          <Grid size={12}>
            <CvUploadField
              cvFile={cvFile}
              cvError={cvError}
              resumeError={errors.resumeUrl?.message}
              onChange={handleCvChange}
            />
          </Grid>
          <Grid size={12}>
            <ConsentCheckbox register={register('consent')} error={errors.consent?.message} />
          </Grid>
        </Grid>

        <SubmitFeedback
          isSuccess={submit.isSuccess}
          isError={submit.isError}
          successMessage="Thank you! Your application has been received. We'll be in touch soon."
        />

        <FormActions isPending={submit.isPending} isSuccess={submit.isSuccess} />
      </Stack>
    </Box>
  );
};

const JobApplication = (): JSX.Element => {
  const { slug = '' } = useParams();
  const { data: job, isLoading, isError } = useJob(slug);

  if (isLoading) {
    return <JobLoading />;
  }

  if (isError || !job) {
    return <JobNotFound />;
  }

  const pageTitle = `Apply — ${job.title}`;

  return (
    <>
      <Seo title={pageTitle} description={`Apply for the ${job.title} position at Impact Africa Alliance.`} />

      <PageHero
        eyebrow="Careers"
        title={job.title}
        subtitle={`${job.location} · ${formatJobType(job.type)}`}
        watermark="africa"
      />

      <Box component="section" sx={{ bgcolor: 'background.default', py: { xs: 6, md: 10 } }}>
        <Container>
          <Grid container spacing={{ xs: 4, md: 6 }} sx={{ justifyContent: 'center' }}>
            <Grid size={{ xs: 12, md: 8, lg: 7 }}>
              <JobApplicationForm job={job} />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </>
  );
};

export default JobApplication;
