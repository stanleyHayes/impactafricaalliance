import { zodResolver } from '@hookform/resolvers/zod';
import {
  PRIVACY_REQUEST_TYPES,
  privacyRequestInputSchema,
  type PrivacyRequestInput,
  type PrivacyRequestType,
} from '@iaa/shared';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

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
      <Seo
        title={copy.seoTitle}
        description={copy.seoDescription}
      />
      <Box
        component="header"
        sx={{ bgcolor: 'common.black', color: 'common.white', py: { xs: 7, md: 10 } }}
      >
        <Container>
          <Typography
            variant="h1"
            sx={{ fontSize: { xs: '2.4rem', md: '3.25rem' }, lineHeight: 1.08 }}
          >
            {copy.heroTitle}
          </Typography>
          <Typography sx={{ mt: 2, color: 'rgba(255,255,255,0.72)' }}>
            {copy.heroSubtitle}
          </Typography>
        </Container>
      </Box>

      <Container sx={{ py: { xs: 6, md: 8 } }}>
        {mutation.isSuccess ? (
          <Stack spacing={2} alignItems="flex-start">
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
                bgcolor: 'rgba(0,30,20,0.04)',
                borderRadius: 2,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {mutation.data?.id}
            </Box>
          </Stack>
        ) : (
          <Stack component="form" spacing={3} onSubmit={onSubmit} sx={{ maxWidth: 600 }}>
            <Typography color="text.secondary">
              {copy.introBody}
            </Typography>
            <TextField
              label="Email address"
              type="email"
              fullWidth
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              {...register('email')}
            />
            <FormControl fullWidth error={Boolean(errors.type)}>
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
            </FormControl>
            <TextField
              label="Details (optional)"
              fullWidth
              multiline
              minRows={4}
              error={Boolean(errors.details)}
              helperText={errors.details?.message}
              {...register('details')}
            />
            <Button
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
      </Container>
    </>
  );
};

export default PrivacyRequest;
