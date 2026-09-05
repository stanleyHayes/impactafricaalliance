import { zodResolver } from '@hookform/resolvers/zod';
import { UserRole } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { FieldRenderer } from '../components/crud/FieldRenderer';
import { FormStepNavigation } from '../components/forms/FormStepNavigation';
import { Markdown } from '../components/markdown/Markdown';
import { PageHeader } from '../components/PageHeader';
import { PageSkeleton } from '../components/PageSkeleton';
import { ApiError } from '../lib/api-client';
import {
  resourceErrorStep,
  resourceFormSteps,
  usesResourceFormPage,
} from '../resources/form-steps';
import { useResourceDetail, useSaveResource } from '../resources/hooks';
import { findResource } from '../resources/registry';
import type { FieldConfig, ResourceConfig, ResourceRow } from '../resources/types';

const reviewText = (field: FieldConfig, value: unknown): string => {
  if (field.type === 'switch') return value ? 'Yes' : 'No';
  if (field.type === 'datetime') {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleString('en-GB');
  }
  if (field.type === 'select')
    return field.options?.find((option) => option.value === value)?.label ?? String(value);
  return Array.isArray(value) ? value.join(', ') : String(value);
};

const saveButtonLabel = (saving: boolean, activeStep: number, count: number): string => {
  if (saving) return 'Saving…';
  if (activeStep === count - 1) return 'Save';
  if (activeStep === count - 2) return 'Review';
  return 'Continue';
};

const ReviewValue = ({ field, value }: { field: FieldConfig; value: unknown }): JSX.Element => {
  if (value === undefined || value === null || value === '') {
    return <Typography color="text.secondary">Not set</Typography>;
  }
  if (
    (field.type === 'image' || field.type === 'file') &&
    typeof value === 'object' &&
    'url' in value
  ) {
    const url = String(value.url);
    return field.type === 'image' ? (
      <Box
        component="img"
        src={url}
        alt={field.label}
        sx={{ maxWidth: '100%', height: 180, objectFit: 'contain', borderRadius: 2 }}
      />
    ) : (
      <Link href={url} target="_blank" rel="noopener noreferrer">
        Open uploaded file
      </Link>
    );
  }
  if (field.type === 'richtext') return <Markdown>{String(value)}</Markdown>;
  return (
    <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {reviewText(field, value) || 'Not set'}
    </Typography>
  );
};

interface ResourceEditorProps {
  resource: ResourceConfig;
  initial?: ResourceRow;
}

const ResourceEditor = ({ resource, initial }: ResourceEditorProps): JSX.Element => {
  const navigate = useNavigate();
  const save = useSaveResource(resource.key);
  const steps = resourceFormSteps(resource);
  const [activeStep, setActiveStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [validating, setValidating] = useState(false);
  const [notice, setNotice] = useState('');
  const validationLock = useRef(false);
  const {
    control,
    handleSubmit,
    trigger,
    getFieldState,
    watch,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(resource.createSchema as never) as Resolver<Record<string, unknown>>,
    defaultValues: { ...resource.defaultValues, ...initial },
    shouldUnregister: false,
  });
  const values = watch();
  const isReview = activeStep === steps.length - 1;
  const busy = save.isPending || validating || Object.values(uploading).some(Boolean);
  const goBack = (): void => {
    if (!busy) void navigate(`/content/${resource.key}`);
  };
  const moveToStep = async (next: number): Promise<void> => {
    if (busy || validationLock.current || next < 0 || next >= steps.length) return;
    if (next <= activeStep) {
      setActiveStep(next);
      setNotice('');
      return;
    }
    validationLock.current = true;
    setValidating(true);
    try {
      const names = steps.slice(0, next).flatMap((step) => step.fields.map((field) => field.name));
      if (!(await trigger(names, { shouldFocus: true }))) {
        setActiveStep(
          resourceErrorStep(
            steps,
            names.filter((name) => getFieldState(name).invalid),
          ),
        );
        setNotice('Please complete the highlighted fields before continuing.');
        return;
      }
      setNotice('');
      setActiveStep(next);
      setMaxStep((previous) => Math.max(previous, next));
    } finally {
      validationLock.current = false;
      setValidating(false);
    }
  };
  const submit = handleSubmit(
    (body) => {
      if (busy) return;
      save.mutate(
        { id: initial?.id, body },
        { onSuccess: () => void navigate(`/content/${resource.key}`) },
      );
    },
    (invalid) => {
      setActiveStep(resourceErrorStep(steps, Object.keys(invalid)));
      setNotice('Please complete the highlighted fields before saving.');
    },
  );

  return (
    <Box sx={{ maxWidth: 1120, mx: 'auto' }}>
      <Button onClick={goBack} disabled={busy} startIcon={<ArrowBackRoundedIcon />} sx={{ mb: 2 }}>
        Back to {resource.label.toLowerCase()}
      </Button>
      <PageHeader
        icon={resource.icon}
        title={`${initial ? 'Edit' : 'Create'} ${resource.singular.toLowerCase()}`}
        description="Work through each section, then review everything before saving."
      />
      <FormStepNavigation
        steps={steps.map((step) => step.label)}
        activeStep={activeStep}
        maxStep={maxStep}
        disabled={busy}
        onStepChange={(next) => void moveToStep(next)}
      />
      <Box
        component="form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          if (isReview) void submit(event);
          else void moveToStep(activeStep + 1);
        }}
        sx={{ mt: 3 }}
      >
        <Box
          component="fieldset"
          disabled={save.isPending || validating}
          sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}
        >
          {steps.slice(0, -1).map((step, index) => (
            <Box
              key={step.label}
              hidden={index !== activeStep}
              sx={{
                p: { xs: 2.5, md: 4 },
                border: 1,
                borderColor: 'divider',
                borderRadius: 3,
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="overline" color="text.secondary">
                Step {index + 1} of {steps.length}
              </Typography>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
                {step.label}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2.5,
                }}
              >
                {step.fields.map((field) => (
                  <Box
                    key={field.name}
                    sx={{ minWidth: 0, gridColumn: field.wide ? '1 / -1' : 'auto' }}
                  >
                    <FieldRenderer
                      field={field}
                      control={control}
                      onUploadingChange={(fieldName, pending) =>
                        setUploading((previous) => ({ ...previous, [fieldName]: pending }))
                      }
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
        {isReview && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Review your {resource.singular.toLowerCase()}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Check the details below. You can return to any section to make changes.
              </Typography>
            </Box>
            {resource.renderPreview && (
              <Box
                sx={{
                  p: { xs: 2.5, md: 4 },
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                }}
              >
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Preview
                </Typography>
                {resource.renderPreview(values)}
              </Box>
            )}
            {steps.slice(0, -1).map((step, index) => (
              <Box
                key={step.label}
                sx={{
                  p: { xs: 2.5, md: 4 },
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <Typography variant="h6">{step.label}</Typography>
                  <Button
                    disabled={busy}
                    startIcon={<EditOutlinedIcon />}
                    onClick={() => void moveToStep(index)}
                  >
                    Edit {step.label.toLowerCase()}
                  </Button>
                </Stack>
                <Stack spacing={2.5}>
                  {step.fields.map((field) => (
                    <Box key={field.name}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 0.75, fontWeight: 700 }}
                      >
                        {field.label}
                      </Typography>
                      <ReviewValue field={field} value={values[field.name]} />
                    </Box>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
        {notice && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {notice}
            {Object.keys(errors).length > 0 && ' Your other entries have been kept.'}
          </Alert>
        )}
        {save.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {save.error.message || 'Could not save. Please try again.'}
          </Alert>
        )}
        <Stack
          direction="row"
          spacing={1.5}
          justifyContent="space-between"
          sx={{
            position: 'sticky',
            bottom: 0,
            mt: 3,
            py: 2,
            bgcolor: 'background.default',
            borderTop: 1,
            borderColor: 'divider',
            zIndex: 2,
          }}
        >
          <Button onClick={goBack} disabled={busy}>
            Cancel
          </Button>
          <Stack direction="row" spacing={1.5}>
            {activeStep > 0 && (
              <Button
                disabled={busy}
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => void moveToStep(activeStep - 1)}
              >
                Back
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={busy}
              startIcon={isReview ? <SaveRoundedIcon /> : undefined}
              endIcon={!isReview ? <ArrowForwardRoundedIcon /> : undefined}
            >
              {saveButtonLabel(save.isPending, activeStep, steps.length)}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};

const ResourceFormLoader = ({
  resource,
  id,
}: {
  resource: ResourceConfig;
  id?: string;
}): JSX.Element => {
  const record = useResourceDetail(resource.key, id);
  const navigate = useNavigate();
  if (id && record.isLoading) return <PageSkeleton cards={2} />;
  if (id && (record.isError || !record.data)) {
    const notFound = record.error instanceof ApiError && record.error.status === 404;
    return (
      <Stack spacing={2}>
        <Alert
          severity={notFound ? 'info' : 'error'}
          action={!notFound && <Button onClick={() => void record.refetch()}>Retry</Button>}
        >
          {notFound
            ? `This ${resource.singular.toLowerCase()} could not be found.`
            : 'Could not load this record. Please try again.'}
        </Alert>
        <Button
          sx={{ alignSelf: 'flex-start' }}
          onClick={() => void navigate(`/content/${resource.key}`)}
          startIcon={<ArrowBackRoundedIcon />}
        >
          Back to {resource.label.toLowerCase()}
        </Button>
      </Stack>
    );
  }
  return (
    <ResourceEditor
      key={`${resource.key}:${id ?? 'new'}`}
      resource={resource}
      initial={id ? record.data : undefined}
    />
  );
};

const ResourceFormPage = (): JSX.Element => {
  const { resource: key = '', id } = useParams();
  const { user } = useAuth();
  const resource = findResource(key);
  if (!resource || (user?.role !== UserRole.Admin && user?.role !== UserRole.Editor))
    return <Navigate to="/" replace />;
  if (!usesResourceFormPage(resource)) return <Navigate to={`/content/${resource.key}`} replace />;
  return <ResourceFormLoader key={`${key}:${id ?? 'new'}`} resource={resource} id={id} />;
};

export default ResourceFormPage;
