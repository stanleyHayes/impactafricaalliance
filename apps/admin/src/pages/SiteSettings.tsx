import { zodResolver } from '@hookform/resolvers/zod';
import { siteSettingUpdateSchema, type SiteSettingUpdate } from '@iaa/shared';
import PublicIcon from '@mui/icons-material/Public';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';

import { PageHeader } from '../components/PageHeader';
import { useSiteSettings, useUpdateSiteSettings } from '../lib/admin-hooks';

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element => (
  <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3 }, border: 1, borderColor: 'divider', borderRadius: 2 }}>
    <Typography variant="h6" sx={{ mb: 2.5 }}>
      {title}
    </Typography>
    <Stack spacing={2}>{children}</Stack>
  </Paper>
);

const getPath = (object: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, object);

interface FormTextFieldProps {
  name: keyof SiteSettingUpdate | `socials.${keyof NonNullable<SiteSettingUpdate['socials']>}`;
  label: string;
  type?: string;
  helperText?: string;
}

const FormTextField = ({ name, label, type = 'text', helperText }: FormTextFieldProps): JSX.Element => {
  const { register, formState } = useFormContext<SiteSettingUpdate>();
  const error = getPath(formState.errors, name) as { message?: string } | undefined;

  return (
    <TextField
      label={label}
      type={type}
      fullWidth
      {...register(name as keyof SiteSettingUpdate)}
      error={Boolean(error)}
      helperText={error?.message ?? helperText}
    />
  );
};

const OrganisationSection = (): JSX.Element => (
  <Section title="Organisation">
    <FormTextField name="siteName" label="Site name" />
    <FormTextField name="tagline" label="Tagline" />
  </Section>
);

const ContactSection = (): JSX.Element => (
  <Section title="Contact">
    <FormTextField name="contactEmail" label="Contact email" type="email" />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <FormTextField name="contactPhone" label="Phone" />
      <FormTextField name="alternatePhone" label="Alternate phone" />
    </Stack>
  </Section>
);

const LocationSection = (): JSX.Element => (
  <Section title="Location">
    <FormTextField name="addressLine1" label="Address line 1" />
    <FormTextField name="addressLine2" label="Address line 2" />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <FormTextField name="city" label="City" />
      <FormTextField name="region" label="Region / state" />
    </Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <FormTextField name="postalCode" label="Postal code" />
      <FormTextField name="country" label="Country" />
    </Stack>
    <FormTextField
      name="mapUrl"
      label="Map URL"
      type="url"
      helperText="Link to Google Maps or another map service"
    />
  </Section>
);

const SocialSection = (): JSX.Element => (
  <Section title="Social media">
    <FormTextField name="socials.facebook" label="Facebook" type="url" />
    <FormTextField name="socials.x" label="X (Twitter)" type="url" />
    <FormTextField name="socials.instagram" label="Instagram" type="url" />
    <FormTextField name="socials.linkedin" label="LinkedIn" type="url" />
    <FormTextField name="socials.youtube" label="YouTube" type="url" />
    <FormTextField name="socials.tiktok" label="TikTok" type="url" />
  </Section>
);

const SiteSettings = (): JSX.Element => {
  const { data, isLoading } = useSiteSettings();
  const update = useUpdateSiteSettings();
  const [success, setSuccess] = useState(false);

  const form = useForm<SiteSettingUpdate>({
    resolver: zodResolver(siteSettingUpdateSchema),
    defaultValues: {
      siteName: '',
      tagline: '',
      contactEmail: '',
      contactPhone: '',
      alternatePhone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      region: '',
      postalCode: '',
      country: '',
      mapUrl: '',
      socials: {
        facebook: '',
        x: '',
        instagram: '',
        linkedin: '',
        youtube: '',
        tiktok: '',
      },
    },
  });

  useEffect(() => {
    if (data) {
      form.reset({
        ...data,
        socials: {
          facebook: data.socials?.facebook ?? '',
          x: data.socials?.x ?? '',
          instagram: data.socials?.instagram ?? '',
          linkedin: data.socials?.linkedin ?? '',
          youtube: data.socials?.youtube ?? '',
          tiktok: data.socials?.tiktok ?? '',
        },
      });
    }
  }, [data, form]);

  const onSubmit = async (values: SiteSettingUpdate): Promise<void> => {
    try {
      await update.mutateAsync(values);
      setSuccess(true);
    } catch {
      // Error is surfaced via update.error
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Site settings"
          description="Manage contact details, location, and social media links."
          icon={<PublicIcon />}
        />
        <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 2 }} />
      </>
    );
  }

  return (
    <FormProvider {...form}>
      <PageHeader
        title="Site settings"
        description="Manage contact details, location, and social media links."
        icon={<PublicIcon />}
        action={
          <Button
            type="submit"
            form="site-settings-form"
            variant="contained"
            disabled={!form.formState.isDirty || update.isPending}
          >
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        }
      />

      {update.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to save site settings: {update.error.message}
        </Alert>
      )}

      <Snackbar
        open={success}
        autoHideDuration={4000}
        onClose={(_event, reason) => {
          if (reason === 'clickaway') return;
          setSuccess(false);
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
          Site settings saved
        </Alert>
      </Snackbar>

      <Box component="form" id="site-settings-form" onSubmit={form.handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Stack spacing={3}>
              <OrganisationSection />
              <ContactSection />
              <LocationSection />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, lg: 5 }}>
            <SocialSection />
          </Grid>
        </Grid>
      </Box>
    </FormProvider>
  );
};

export default SiteSettings;
