import { zodResolver } from '@hookform/resolvers/zod';
import {
  isSocialEnabled,
  siteSettingUpdateSchema,
  SOCIAL_CHANNEL_KEYS,
  type SiteSetting,
  type SiteSettingUpdate,
  type SiteSettingUpdateInput,
} from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PublicIcon from '@mui/icons-material/Public';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  type FieldErrors,
} from 'react-hook-form';

import { FormStepNavigation } from '../components/forms/FormStepNavigation';
import { PageHeader } from '../components/PageHeader';
import { FormPageSkeleton } from '../components/PageSkeleton';
import { useSiteSettings, useUpdateSiteSettings } from '../lib/admin-hooks';
import {
  firstInvalidSettingStep,
  getSettingPath,
  SITE_SETTING_STEPS,
  type SiteSettingField,
} from '../lib/site-settings-form';

const SettingField = ({ field }: { field: SiteSettingField }): JSX.Element => {
  const { register, control, formState } = useFormContext<SiteSettingUpdateInput>();
  const error = getSettingPath(formState.errors, field.name) as { message?: string } | undefined;

  if (field.type === 'switch') {
    return (
      <Controller
        control={control}
        name={field.name}
        render={({ field: controller }) => (
          <FormControlLabel
            label={field.label}
            control={
              <Switch
                checked={Boolean(controller.value)}
                onChange={(event) => controller.onChange(event.target.checked)}
                slotProps={{ input: { ref: controller.ref } }}
              />
            }
          />
        )}
      />
    );
  }

  return (
    <TextField
      label={field.label}
      type={field.type ?? 'text'}
      multiline={field.multiline}
      minRows={field.multiline ? 3 : undefined}
      fullWidth
      {...register(
        field.name,
        field.type === 'number'
          ? { setValueAs: (value: string) => (value === '' ? undefined : Number(value)) }
          : {},
      )}
      error={Boolean(error)}
      helperText={error?.message ?? field.helperText}
    />
  );
};

const SOCIAL_KEYS = ['facebook', 'x', 'instagram', 'linkedin', 'youtube', 'tiktok'] as const;

const toSocialValues = (data: SiteSetting): SiteSettingUpdateInput['socials'] =>
  Object.fromEntries(SOCIAL_KEYS.map((key) => [key, data.socials?.[key] ?? '']));

const toAnnouncementValues = (data: SiteSetting): SiteSettingUpdateInput['announcement'] => ({
  enabled: data.announcement?.enabled ?? false,
  message: data.announcement?.message ?? '',
  linkUrl: data.announcement?.linkUrl ?? '',
  linkLabel: data.announcement?.linkLabel ?? '',
});

const toPopupValues = (data: SiteSetting): SiteSettingUpdateInput['popup'] => {
  const { enabled, title, message, ctaLabel, ctaUrl, imageUrl, delaySeconds } = data.popup ?? {};
  return {
    enabled: enabled ?? false,
    title: title ?? '',
    message: message ?? '',
    ctaLabel: ctaLabel ?? '',
    ctaUrl: ctaUrl ?? '',
    imageUrl: imageUrl ?? '',
    delaySeconds: delaySeconds ?? 2,
  };
};

/**
 * Map a saved record onto the form's edit shape: every field becomes a
 * controlled string, and `regionalPresence` flattens to comma-separated text
 * (the zod schema parses it back to an array on submit).
 */
/**
 * The switches, with the defaults filled in.
 *
 * A site that has never been told which channels to show falls back to
 * LinkedIn only, so the form has to show that rather than every switch off —
 * otherwise it would misreport what the site is actually doing.
 */
const toSocialsEnabledValues = (data: SiteSetting): Record<string, boolean> =>
  Object.fromEntries(
    SOCIAL_CHANNEL_KEYS.map((key) => [key, isSocialEnabled(data.socialsEnabled, key)]),
  );

const toFormValues = (data: SiteSetting): SiteSettingUpdateInput => ({
  ...data,
  regionalPresence: (data.regionalPresence ?? []).join(', '),
  announcement: toAnnouncementValues(data),
  popup: toPopupValues(data),
  liveChat: {
    enabled: data.liveChat?.enabled ?? false,
    label: data.liveChat?.label ?? '',
    greeting: data.liveChat?.greeting ?? '',
  },
  socials: toSocialValues(data),
  socialsEnabled: toSocialsEnabledValues(data),
});

const SiteSettings = (): JSX.Element => {
  const settings = useSiteSettings();
  const update = useUpdateSiteSettings();
  const [success, setSuccess] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastStep = SITE_SETTING_STEPS.length - 1;
  const step = SITE_SETTING_STEPS[activeStep]!;

  const form = useForm<SiteSettingUpdateInput, unknown, SiteSettingUpdate>({
    resolver: zodResolver(siteSettingUpdateSchema),
    shouldUnregister: false,
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
      regionalPresence: '',
      mapUrl: '',
      announcement: { enabled: false, message: '', linkUrl: '', linkLabel: '' },
      liveChat: { enabled: false, label: '', greeting: '' },
      popup: {
        enabled: false,
        title: '',
        message: '',
        ctaLabel: '',
        ctaUrl: '',
        imageUrl: '',
        delaySeconds: 2,
      },
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
  const { isDirty } = form.formState;
  const reset = form.reset;
  const initialized = useRef(false);
  const lastReceived = useRef<SiteSetting | undefined>(undefined);

  useEffect(() => {
    // Background refetches must not erase edits made on another step.
    if (settings.data && settings.data !== lastReceived.current) {
      lastReceived.current = settings.data;
      if (!initialized.current || !isDirty) {
        reset(toFormValues(settings.data));
        initialized.current = true;
      }
    }
  }, [settings.data, isDirty, reset]);

  const showStep = (next: number): void => {
    setActiveStep(next);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const changeStep = async (next: number): Promise<void> => {
    if (update.isPending || next === activeStep) return;
    if (next > activeStep) {
      const valid = await form.trigger(
        step.fields.map((field) => field.name),
        { shouldFocus: true },
      );
      if (!valid) return;
    }
    showStep(next);
  };

  const onSubmit = async (values: SiteSettingUpdate): Promise<void> => {
    try {
      const saved = await update.mutateAsync(values);
      reset(toFormValues(saved));
      setSuccess(true);
    } catch {
      // The persistent error below keeps the current step and all edited values.
    }
  };

  const onInvalid = (errors: FieldErrors<SiteSettingUpdateInput>): void => {
    const invalidStep = firstInvalidSettingStep(errors);
    if (invalidStep >= 0) showStep(invalidStep);
  };

  if (settings.isLoading) return <FormPageSkeleton steps fields={5} />;

  if (settings.isError) {
    return (
      <>
        <PageHeader title="Site settings" icon={<PublicIcon />} />
        <Alert
          severity="error"
          action={<Button onClick={() => void settings.refetch()}>Retry</Button>}
        >
          Could not load site settings. Please try again before making changes.
        </Alert>
      </>
    );
  }

  return (
    <FormProvider {...form}>
      <PageHeader
        title="Site settings"
        description="Update your public information in focused steps. Save all changes when you are ready."
        icon={<PublicIcon />}
      />

      <FormStepNavigation
        steps={SITE_SETTING_STEPS.map((item) => item.label)}
        activeStep={activeStep}
        maxStep={lastStep}
        onStepChange={(next) => void changeStep(next)}
        disabled={update.isPending}
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

      <Box
        component="form"
        id="site-settings-form"
        noValidate
        onSubmit={(event) => {
          if (activeStep < lastStep) {
            event.preventDefault();
            void changeStep(activeStep + 1);
          } else {
            void form.handleSubmit(onSubmit, onInvalid)(event);
          }
        }}
      >
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 3, minHeight: 350 }}>
          <Box sx={{ mb: 3, maxWidth: 700 }}>
            <Typography
              ref={headingRef}
              component="h2"
              variant="h5"
              tabIndex={-1}
              sx={{ outline: 'none' }}
            >
              {step.title}
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0.75 }}>
              {step.description}
            </Typography>
          </Box>

          <Box
            component="fieldset"
            disabled={update.isPending}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
              border: 0,
              p: 0,
              m: 0,
              minWidth: 0,
              maxWidth: 760,
            }}
          >
            {step.fields.map((field) => (
              <SettingField key={field.name} field={field} />
            ))}
          </Box>
        </Paper>

        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
          sx={{ mt: 3 }}
        >
          <Button
            type="button"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => void changeStep(activeStep - 1)}
            disabled={activeStep === 0 || update.isPending}
          >
            Back
          </Button>
          {activeStep === lastStep ? (
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveRoundedIcon />}
              disabled={!isDirty || update.isPending}
            >
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          ) : (
            <Button type="submit" variant="contained" endIcon={<ArrowForwardRoundedIcon />}>
              Continue
            </Button>
          )}
        </Stack>
      </Box>
    </FormProvider>
  );
};

export default SiteSettings;
