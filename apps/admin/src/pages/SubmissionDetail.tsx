import {
  submissionSchema,
  SUBMISSION_STATUSES,
  type Submission,
  type SubmissionStatus,
} from '@iaa/shared';
import { Alert, Button, MenuItem, Paper, Skeleton, Stack, TextField } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

import { useCan } from '../auth/useCan';
import { RecordActions, RecordFields, fieldLabel } from '../components/data/RecordActions';
import { FormStepNavigation } from '../components/forms/FormStepNavigation';
import { PageHeader } from '../components/PageHeader';
import { api } from '../lib/api-client';

const groups: Record<Submission['type'], { label: string; fields: string[] }[]> = {
  contact: [
    { label: 'Contact', fields: ['name', 'email'] },
    { label: 'Message', fields: ['subject', 'message'] },
  ],
  partner: [
    { label: 'Contact & organisation', fields: ['name', 'email', 'organizationName', 'country'] },
    { label: 'Partnership', fields: ['partnershipInterest', 'message'] },
  ],
  volunteer: [
    { label: 'Contact', fields: ['name', 'email', 'country'] },
    { label: 'Volunteering', fields: ['expertise', 'availabilityHoursPerMonth', 'message'] },
  ],
  job: [
    { label: 'Applicant', fields: ['name', 'email', 'phone', 'country'] },
    { label: 'Role & links', fields: ['jobSlug', 'jobTitle', 'linkedInUrl', 'portfolioUrl'] },
    { label: 'Application', fields: ['coverLetter', 'resumeUrl', 'resumePublicId'] },
  ],
};

const inputType = (key: string): string => {
  if (key === 'availabilityHoursPerMonth') return 'number';
  return key === 'email' ? 'email' : 'text';
};
const inputValue = (key: string, value: string): string | number | undefined => {
  if (key !== 'availabilityHoursPerMonth') return value;
  return value === '' ? undefined : Number(value);
};

const SubmissionEditor = ({ item }: { item: Submission }): JSX.Element => {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [payload, setPayload] = useState(item.payload);
  const [status, setStatus] = useState(item.status);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const sections = [...groups[item.type], { label: 'Status & review', fields: [] }];
  const final = step === sections.length - 1;
  const actionLabel = final ? 'Save changes' : 'Continue';
  const save = useMutation({
    mutationFn: () => api.patch<Submission>(`/admin/submissions/${item.id}`, { status, payload }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['submissions'] });
      void navigate(`/submissions/records/${item.id}`);
    },
  });
  const advance = (): void => {
    const parsed = submissionSchema.safeParse({ ...payload, type: item.type, consent: true });
    const issues = parsed.success
      ? []
      : parsed.error.issues.filter(
          (issue) => final || sections[step]!.fields.includes(String(issue.path[0])),
        );
    setErrors(Object.fromEntries(issues.map((issue) => [String(issue.path[0]), issue.message])));
    if (issues.length) {
      if (final)
        setStep(
          Math.max(
            0,
            sections.findIndex((section) => section.fields.includes(String(issues[0]!.path[0]))),
          ),
        );
      return;
    }
    if (final) save.mutate();
    else setStep(step + 1);
  };
  return (
    <Paper
      component="form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!save.isPending) advance();
      }}
      sx={{ p: { xs: 2, md: 3 } }}
    >
      <FormStepNavigation
        steps={sections.map((section) => section.label)}
        activeStep={step}
        onStepChange={setStep}
        disabled={save.isPending}
      />
      {save.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {save.error.message}
        </Alert>
      )}
      <Stack spacing={2}>
        {sections[step]!.fields.map((key) => (
          <TextField
            key={key}
            label={fieldLabel(key)}
            value={payload[key] ?? ''}
            disabled={save.isPending}
            error={Boolean(errors[key])}
            helperText={errors[key]}
            multiline={['message', 'coverLetter'].includes(key)}
            minRows={['message', 'coverLetter'].includes(key) ? 5 : undefined}
            type={inputType(key)}
            onChange={(event) =>
              setPayload((previous) => ({
                ...previous,
                [key]: inputValue(key, event.target.value),
              }))
            }
          />
        ))}
        {final && (
          <>
            <TextField
              select
              label="Status"
              value={status}
              disabled={save.isPending}
              onChange={(event) => setStatus(event.target.value as SubmissionStatus)}
            >
              {SUBMISSION_STATUSES.map((value) => (
                <MenuItem key={value} value={value}>
                  {fieldLabel(value)}
                </MenuItem>
              ))}
            </TextField>
            <RecordFields record={{ ...item, status, payload }} />
          </>
        )}
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
          <Button
            disabled={save.isPending}
            onClick={() =>
              step ? setStep(step - 1) : void navigate(`/submissions/records/${item.id}`)
            }
          >
            {step ? 'Back' : 'Cancel'}
          </Button>
          <Button type="submit" variant="contained" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : actionLabel}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

const SubmissionDetail = ({ edit = false }: { edit?: boolean }): JSX.Element => {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const allowed = can('read', 'submissions') && (!edit || can('update', 'submissions'));
  const query = useQuery({
    queryKey: ['submissions', 'detail', id],
    queryFn: () => api.get<Submission>(`/admin/submissions/${id}`),
    enabled: allowed && Boolean(id),
  });
  if (!allowed)
    return (
      <Alert severity="warning">
        You do not have permission to {edit ? 'edit' : 'view'} submissions.
      </Alert>
    );
  return (
    <Stack spacing={2}>
      <Button component={RouterLink} to="/submissions" sx={{ alignSelf: 'flex-start' }}>
        Back to submissions
      </Button>
      <PageHeader
        title={edit ? 'Edit submission' : 'Submission details'}
        description="Complete enquiry, attachments, and consent information."
      />
      {query.isLoading && <Skeleton variant="rounded" height={400} />}
      {query.isError && (
        <Alert
          severity="error"
          action={<Button onClick={() => void query.refetch()}>Retry</Button>}
        >
          {query.error.message}
        </Alert>
      )}
      {query.data &&
        (edit ? (
          <SubmissionEditor key={query.data.id} item={query.data} />
        ) : (
          <Paper sx={{ p: 3 }}>
            <RecordFields record={query.data as unknown as Record<string, unknown>} />
            <Stack sx={{ mt: 3 }}>
              {' '}
              <RecordActions
                record={query.data as unknown as Record<string, unknown>}
                resource="submissions"
                endpoint="/admin/submissions"
                deletable
                onEdit={() => void navigate(`/submissions/records/${id}/edit`)}
              />
            </Stack>
          </Paper>
        ))}
    </Stack>
  );
};
export default SubmissionDetail;
