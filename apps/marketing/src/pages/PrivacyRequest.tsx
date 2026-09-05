import { zodResolver } from '@hookform/resolvers/zod';
import {
  PRIVACY_REQUEST_TYPES,
  privacyRequestInputSchema,
  type PrivacyRequestInput,
  type PrivacyRequestType,
} from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { LegalLayout } from '../components/legal/LegalLayout';
import { Seo } from '../components/Seo';
import { apiPost } from '../lib/api-client';
import { usePageCopy } from '../lib/content-hooks';

const TYPE_LABELS: Record<PrivacyRequestType, string> = {
  access: 'Access my data',
  rectify: 'Correct my data',
  delete: 'Delete my data',
  restrict: 'Restrict processing of my data',
  object: 'Object to processing of my data',
};

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
            <FormControl fullWidth disabled={mutation.isPending} error={Boolean(errors.type)}>
              <InputLabel id="request-type-label">Request type</InputLabel>
              <Select
                labelId="request-type-label"
                label="Request type"
                defaultValue="access"
                {...register('type')}
              >
                {PRIVACY_REQUEST_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </MenuItem>
                ))}
              </Select>
              {errors.type && <FormHelperText>{errors.type.message}</FormHelperText>}
            </FormControl>
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
