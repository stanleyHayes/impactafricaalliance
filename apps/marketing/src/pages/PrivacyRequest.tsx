import { zodResolver } from '@hookform/resolvers/zod';
import {
  privacyRequestInputSchema,
  type PrivacyRequestInput,
} from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import PauseCircleOutlineRoundedIcon from '@mui/icons-material/PauseCircleOutlineRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';

import { OptionSelect, type SelectChoice } from '../components/forms/OptionSelect';
import { LegalLayout } from '../components/legal/LegalLayout';
import { Seo } from '../components/Seo';
import { apiPost } from '../lib/api-client';
import { usePageCopy } from '../lib/content-hooks';

/** Each right, named as the law names it and explained as a person would say it. */
const TYPE_OPTIONS: SelectChoice[] = [
  {
    value: 'access',
    label: 'Access my data',
    description: 'Get a copy of everything we hold about you.',
    icon: <FolderOpenRoundedIcon />,
  },
  {
    value: 'rectify',
    label: 'Correct my data',
    description: 'Something we hold is wrong or out of date.',
    icon: <EditOutlinedIcon />,
  },
  {
    value: 'delete',
    label: 'Delete my data',
    description: 'Erase what we hold, where we are not required to keep it.',
    icon: <DeleteOutlineRoundedIcon />,
  },
  {
    value: 'restrict',
    label: 'Restrict processing of my data',
    description: 'Keep it, but stop using it while something is resolved.',
    icon: <PauseCircleOutlineRoundedIcon />,
  },
  {
    value: 'object',
    label: 'Object to processing of my data',
    description: 'You disagree with a particular use of your data.',
    icon: <BlockRoundedIcon />,
  },
];

const PrivacyRequest = (): JSX.Element => {
  const copy = usePageCopy('privacy-request', {
    seoTitle: 'Privacy Request — Impact Africa Alliance',
    seoDescription: 'Submit a data subject request under the Ghana Data Protection Act 2012.',
    heroTitle: 'Privacy Request',
    heroSubtitle: 'Exercise your rights under the Ghana Data Protection Act 2012 (Act 843).',
    introBody:
      'Use this form to ask about the personal data we hold, to correct it, to object to or restrict processing, or to request deletion. We may contact you to confirm your identity before acting on the request.',
  });
  const mutation = useMutation({
    mutationFn: (input: PrivacyRequestInput) =>
      apiPost<{ id: string; verificationToken: string }>('/privacy/requests', input),
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PrivacyRequestInput>({
    resolver: zodResolver(privacyRequestInputSchema),
    defaultValues: { type: 'access' },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  return (
    <>
      <Seo title={copy.seoTitle} description={copy.seoDescription} />
      <LegalLayout title={copy.heroTitle} subtitle={copy.heroSubtitle}>
        {mutation.isSuccess ? (
          <Stack
            spacing={2}
            alignItems="flex-start"
            sx={{
              p: { xs: 3, md: 4 },
              border: 1,
              borderColor: 'divider',
              borderRadius: 4,
              bgcolor: (theme) => alpha(theme.palette.text.secondary, 0.045),
            }}
            role="status"
          >
            <CheckCircleRoundedIcon sx={{ fontSize: 48, color: 'success.main' }} />
            <Typography variant="h5">Request received</Typography>
            <Typography color="text.secondary">
              Thank you. We have recorded your request and will respond within the timeframes set
              out in the Data Protection Act. Please keep your reference safe:
            </Typography>
            <Box
              component="pre"
              sx={{
                p: 2,
                bgcolor: 'action.hover',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                maxWidth: '100%',
                borderRadius: 2,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {mutation.data?.id}
            </Box>
          </Stack>
        ) : (
          <Stack
            component="form"
            spacing={3}
            onSubmit={onSubmit}
            noValidate
            sx={{
              p: { xs: 2.5, md: 4 },
              border: 1,
              borderColor: 'divider',
              borderRadius: 4,
              bgcolor: (theme) => alpha(theme.palette.text.secondary, 0.045),
              '& .MuiOutlinedInput-root': {
                bgcolor: (theme) => alpha(theme.palette.text.secondary, 0.035),
              },
            }}
          >
            <Box>
              <Typography variant="overline" color="text.secondary">
                Your information. Your choices.
              </Typography>
              <Typography component="h2" variant="h5" sx={{ mt: 1, mb: 1.5 }}>
                How can we help?
              </Typography>
              <Typography color="text.secondary">{copy.introBody}</Typography>
            </Box>
            <TextField
              label="Email address"
              type="email"
              autoComplete="email"
              disabled={mutation.isPending}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutlineRoundedIcon sx={{ fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
              fullWidth
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              {...register('email')}
            />
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <OptionSelect
                  label="Request type"
                  options={TYPE_OPTIONS}
                  value={field.value ?? 'access'}
                  onChange={field.onChange}
                  disabled={mutation.isPending}
                  error={errors.type?.message}
                />
              )}
            />
            <TextField
              label="Details (optional)"
              disabled={mutation.isPending}
              fullWidth
              multiline
              minRows={4}
              error={Boolean(errors.details)}
              helperText={errors.details?.message}
              {...register('details')}
            />
            {mutation.isError && (
              <Alert severity="error" role="alert">
                We couldn’t send your request. Please try again. Your details are still here.
              </Alert>
            )}
            <Button
              endIcon={<ArrowForwardRoundedIcon />}
              type="submit"
              variant="contained"
              size="large"
              disabled={mutation.isPending}
              sx={{ alignSelf: 'flex-start' }}
            >
              {mutation.isPending ? 'Submitting…' : 'Submit request'}
            </Button>
          </Stack>
        )}
      </LegalLayout>
    </>
  );
};

export default PrivacyRequest;
