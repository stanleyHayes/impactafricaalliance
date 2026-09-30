import type { AdminApplication, ApplicationAnswer, FormField } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import QuestionAnswerOutlinedIcon from '@mui/icons-material/QuestionAnswerOutlined';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

import { useCan } from '../../auth/useCan';
import { AnswerValue } from '../../components/applications/AnswerValue';
import { ApplicationStatusChip } from '../../components/applications/ApplicationChips';
import { ReviewsSection } from '../../components/applications/ReviewsSection';
import { StatusChangePanel } from '../../components/applications/StatusChangePanel';
import { StatusHistory } from '../../components/applications/StatusHistory';
import { DetailSection } from '../../components/detail/DetailSection';
import { EmptyState } from '../../components/EmptyState';
import { InformationItem } from '../../components/InformationItem';
import { PageHeader } from '../../components/PageHeader';
import { useApplication } from '../../lib/applications';
import { formatInstant } from '../../lib/forms';
import { pageGuides } from '../../lib/page-guides';
import { backLinkSx } from '../../theme/surfaces';

const QuestionRow = ({
  label,
  field,
  answer,
}: {
  label: string;
  field: FormField | undefined;
  answer: ApplicationAnswer | undefined;
}): JSX.Element => (
  <Box
    component="div"
    sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}
  >
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
      {label}
    </Typography>
    <AnswerValue field={field} value={answer?.value} />
  </Box>
);

/**
 * The answers in the order and wording the applicant saw, one section per
 * step. Questions they were not asked or left blank read "Not answered".
 */
const AnswersByStep = ({ application }: { application: AdminApplication }): JSX.Element => {
  const answers = new Map(application.answers.map((answer) => [answer.fieldId, answer]));
  const extras = application.answers.filter((answer) => !answer.stepId);
  return (
    <Stack spacing={3}>
      {application.definition.steps.map((step) => (
        <DetailSection
          key={step.id}
          title={step.title}
          icon={<QuestionAnswerOutlinedIcon />}
          description={step.description}
        >
          {step.fields.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              A page to read, with no questions.
            </Typography>
          ) : (
            step.fields.map((field) => (
              <QuestionRow
                key={field.id}
                label={field.label}
                field={field}
                answer={answers.get(field.id)}
              />
            ))
          )}
        </DetailSection>
      ))}
      {extras.length > 0 && (
        <DetailSection
          title="Other answers"
          icon={<QuestionAnswerOutlinedIcon />}
          description="Answers to questions this version of the form does not list."
        >
          {extras.map((answer) => (
            <QuestionRow
              key={answer.fieldId}
              label={answer.label}
              field={undefined}
              answer={answer}
            />
          ))}
        </DetailSection>
      )}
    </Stack>
  );
};

const ApplicantDetails = ({
  application,
  canReadForms,
}: {
  application: AdminApplication;
  /** A reviewer may read applications without reading forms; the form's page would refuse them. */
  canReadForms: boolean;
}): JSX.Element => (
  <DetailSection title="Applicant" icon={<BadgeOutlinedIcon />}>
    <Stack spacing={2}>
      <InformationItem label="Name">{application.applicant.name ?? 'Not given'}</InformationItem>
      <InformationItem label="Email">
        {application.applicant.email ? (
          <Link href={`mailto:${application.applicant.email}`}>{application.applicant.email}</Link>
        ) : (
          'Not given'
        )}
      </InformationItem>
      <InformationItem label="Phone">{application.applicant.phone ?? 'Not given'}</InformationItem>
      <InformationItem label="Submitted">{formatInstant(application.submittedAt)}</InformationItem>
      <InformationItem label="Form">
        {canReadForms ? (
          <Link component={RouterLink} to={`/forms/${application.form.id}`}>
            {application.form.title}
          </Link>
        ) : (
          application.form.title
        )}{' '}
        (version {application.formVersion})
      </InformationItem>
      <InformationItem label="Consent">
        {application.consent
          ? `Agreed to privacy wording ${application.consent.version} on ${formatInstant(application.consent.at)}`
          : 'This form asked for no consent'}
      </InformationItem>
    </Stack>
  </DetailSection>
);

const DetailSkeleton = (): JSX.Element => (
  <Box
    aria-busy="true"
    aria-label="Loading the application"
    sx={{
      display: 'grid',
      gap: 3,
      gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 3fr) minmax(0, 2fr)' },
    }}
  >
    <Stack spacing={3}>
      {[260, 200].map((height) => (
        <Skeleton key={height} variant="rounded" height={height} sx={{ borderRadius: 3 }} />
      ))}
    </Stack>
    <Stack spacing={3}>
      {[180, 160, 140].map((height) => (
        <Skeleton key={height} variant="rounded" height={height} sx={{ borderRadius: 3 }} />
      ))}
    </Stack>
  </Box>
);

/**
 * One application (plan §4.3): the applicant, their answers grouped by step
 * in the order they saw them, files to download, internal reviews, the status
 * with a note, and its history. Everything here is internal.
 */
const ApplicationDetailPage = (): JSX.Element => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const query = useApplication(applicationId);
  const application = query.data;
  const canUpdate = can('update', 'applications');

  if (query.isPending) {
    return (
      <>
        <PageHeader
          title="Application"
          icon={<AssignmentIndIcon />}
          help={pageGuides['application-detail']}
        />
        <DetailSkeleton />
      </>
    );
  }
  if (!application) {
    if (query.error?.status === 404) {
      return (
        <>
          <PageHeader title="Application" icon={<AssignmentIndIcon />} />
          <EmptyState
            icon={<SearchOffRoundedIcon />}
            title="Application not found"
            description="It may have been removed after a privacy request, or the link is wrong. Unfinished drafts never appear here."
            primaryAction={{ label: 'All applications', onClick: () => navigate('/applications') }}
          />
        </>
      );
    }
    return (
      <Stack spacing={2}>
        <PageHeader title="Application" icon={<AssignmentIndIcon />} />
        <Alert
          severity="error"
          action={<Button onClick={() => void query.refetch()}>Retry</Button>}
        >
          {query.error?.message || 'The application could not be loaded.'}
        </Alert>
      </Stack>
    );
  }

  return (
    <>
      <PageHeader
        title={application.applicant.name ?? application.reference}
        description={`${application.reference} · ${application.form.title} · Submitted ${formatInstant(application.submittedAt)}`}
        icon={<AssignmentIndIcon />}
        help={pageGuides['application-detail']}
        action={<ApplicationStatusChip status={application.status} size="medium" />}
      />
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ sm: 'center' }}
        sx={{ mb: 3 }}
      >
        <Button
          component={RouterLink}
          to="/applications"
          startIcon={<ArrowBackRoundedIcon />}
          sx={backLinkSx}
        >
          All applications
        </Button>
        <Alert severity="info" icon={<LockOutlinedIcon />} sx={{ flex: 1 }}>
          Internal only. Applicants never see reviews, notes or status changes, and are not emailed
          when the status changes.
        </Alert>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 3fr) minmax(0, 2fr)' },
          alignItems: 'start',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <AnswersByStep application={application} />
        </Box>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <ApplicantDetails application={application} canReadForms={can('read', 'forms')} />
          <StatusChangePanel application={application} canUpdate={canUpdate} />
          <ReviewsSection application={application} canUpdate={canUpdate} />
          <StatusHistory history={application.statusHistory} />
        </Stack>
      </Box>
    </>
  );
};

export default ApplicationDetailPage;
