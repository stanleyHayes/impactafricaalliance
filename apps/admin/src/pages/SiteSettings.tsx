import { zodResolver } from '@hookform/resolvers/zod';
import {
  siteSettingUpdateSchema,
  type SiteSetting,
  type SiteSettingUpdate,
  type SiteSettingUpdateInput,
} from '@iaa/shared';
import PublicIcon from '@mui/icons-material/Public';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { Controller, FormProvider, useForm, useFormContext } from 'react-hook-form';

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
  name:
    | keyof SiteSettingUpdateInput
    | `socials.${keyof NonNullable<SiteSettingUpdateInput['socials']>}`
    | `announcement.${keyof NonNullable<SiteSettingUpdateInput['announcement']>}`;
  label: string;
  type?: string;
  helperText?: string;
}

const FormTextField = ({ name, label, type = 'text', helperText }: FormTextFieldProps): JSX.Element => {
  const { register, formState } = useFormContext<SiteSettingUpdateInput>();
  const error = getPath(formState.errors, name) as { message?: string } | undefined;

  return (
    <TextField
      label={label}
      type={type}
      fullWidth
      {...register(name as keyof SiteSettingUpdateInput)}
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
      <FormTextField
        name="whatsappPhone"
        label="WhatsApp"
        helperText="Leave blank to reuse the phone number above."
      />
    </Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <FormTextField
        name="alternatePhone"
        label="Alternate phone"
        helperText="Second office line, e.g. the Nigeria number."
      />
      <FormTextField
        name="alternatePhoneLabel"
        label="Alternate phone label"
        helperText='Shown as the heading, e.g. "Nigeria".'
      />
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
      name="regionalPresence"
      label="Regional presence"
      helperText="Comma-separated countries shown as chips on the Contact page, e.g. Nigeria, Sierra Leone"
    />
    <FormTextField
      name="mapUrl"
      label="Map URL"
      type="url"
      helperText="Link to Google Maps or another map service"
    />
  </Section>
);

const AnnouncementSection = (): JSX.Element => {
  const { control } = useFormContext<SiteSettingUpdateInput>();

  return (
    <Section title="Announcement banner">
      <Controller
        control={control}
        name="announcement.enabled"
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(field.value)}
                onChange={(event) => field.onChange(event.target.checked)}
              />
            }
            label="Show the banner on the public site"
          />
        )}
      />
      <FormTextField
        name="announcement.message"
        label="Message"
        helperText="Shown across the top of every page, above the header."
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormTextField name="announcement.linkUrl" label="Link URL" type="url" />
        <FormTextField
          name="announcement.linkLabel"
          label="Link label"
          helperText='e.g. "Register"'
        />
      </Stack>
    </Section>
  );
};

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

const SOCIAL_KEYS = ['facebook', 'x', 'instagram', 'linkedin', 'youtube', 'tiktok'] as const;

/**
 * Map a saved record onto the form's edit shape: every field becomes a
 * controlled string, and `regionalPresence` flattens to comma-separated text
 * (the zod schema parses it back to an array on submit).
 */
const toFormValues = (data: SiteSetting): SiteSettingUpdateInput => ({
  ...data,
  regionalPresence: (data.regionalPresence ?? []).join(', '),
  announcement: {
    enabled: data.announcement?.enabled ?? false,
    message: data.announcement?.message ?? '',
    linkUrl: data.announcement?.linkUrl ?? '',
    linkLabel: data.announcement?.linkLabel ?? '',
  },
  socials: Object.fromEntries(SOCIAL_KEYS.map((key) => [key, data.socials?.[key] ?? ''])),
});

const SiteSettings = (): JSX.Element => {
  const { data, isLoading } = useSiteSettings();
  const update = useUpdateSiteSettings();
  const [success, setSuccess] = useState(false);

  const form = useForm<SiteSettingUpdateInput, unknown, SiteSettingUpdate>({
    resolver: zodResolver(siteSettingUpdateSchema),
    defaultValues: {
      siteName: '',
      tagline: '',
      contactEmail: '',
      contactPhone: '',
      whatsappPhone: '',
      alternatePhone: '',
      alternatePhoneLabel: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      region: '',
      postalCode: '',
      country: '',
      mapUrl: '',
      announcement: { enabled: false, message: '', linkUrl: '', linkLabel: '' },
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
      form.reset(toFormValues(data));
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
            <Stack spacing={3}>
              <AnnouncementSection />
              <SocialSection />
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </FormProvider>
  );
};

export default SiteSettings;
