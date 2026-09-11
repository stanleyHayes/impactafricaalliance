import {
  ADMIN_RESOURCES,
  PERMISSION_ACTIONS,
  ROLE_TEMPLATES,
  inviteUserSchema,
  updateUserPermissionsSchema,
  type Permission,
  type PublicUser,
  type UserRole,
} from '@iaa/shared';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { PermissionMatrix } from '../components/auth/PermissionMatrix';
import { OptionSelect } from '../components/fields/OptionSelect';
import { FormStepNavigation } from '../components/forms/FormStepNavigation';
import { PageHeader } from '../components/PageHeader';
import { FormPageSkeleton } from '../components/PageSkeleton';
import { useInviteUser, useUpdateUserPermissions, useUsers } from '../lib/admin-hooks';
import { ROLE_OPTIONS } from '../lib/select-options';

const steps = ['Identity', 'Permissions', 'Review'] as const;

const resourceLabel = (resource: string): string =>
  resource.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const PermissionSummary = ({ permissions }: { permissions: Permission[] }): JSX.Element => (
  <Stack spacing={1.25}>
    <Typography variant="subtitle2">{permissions.length} resource permissions</Typography>
    {permissions.length === 0 ? (
      <Alert severity="warning">No resource permissions are selected.</Alert>
    ) : (
      ADMIN_RESOURCES.filter((resource) =>
        PERMISSION_ACTIONS.some((action) => permissions.includes(`${resource}:${action}`)),
      ).map((resource) => (
        <Stack
          key={resource}
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={0.75}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {resourceLabel(resource)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {PERMISSION_ACTIONS.filter((action) =>
              permissions.includes(`${resource}:${action}`),
            ).join(', ')}
          </Typography>
        </Stack>
      ))
    )}
  </Stack>
);

interface AccessStepProps {
  user?: PublicUser;
  email: string;
  role: UserRole;
  permissions: Permission[];
  effectivePermissions: Permission[];
  customize: boolean;
  validationError?: string;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: UserRole) => void;
  onCustomizeChange: (customize: boolean) => void;
  onPermissionsChange: (permissions: Permission[]) => void;
}

const IdentityStep = ({
  user,
  email,
  role,
  validationError,
  onEmailChange,
  onRoleChange,
}: AccessStepProps): JSX.Element => (
  <Stack spacing={2.5} sx={{ maxWidth: 600 }}>
    {user ? (
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar>{user.name.charAt(0).toUpperCase()}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>{user.name}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
            {user.email}
          </Typography>
        </Box>
        <Chip size="small" label={user.isActive ? 'Active' : 'Inactive'} variant="outlined" />
      </Stack>
    ) : (
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => {
          onEmailChange(event.target.value);
        }}
        error={Boolean(validationError)}
        helperText={validationError ?? 'The invitation will be sent to this address.'}
      />
    )}
    <OptionSelect
      label="Role"
      options={ROLE_OPTIONS}
      value={role}
      onChange={(value: string) => onRoleChange(value as UserRole)}
    />
    <Typography variant="body2" color="text.secondary">
      Review individual resource permissions in the next step.
    </Typography>
  </Stack>
);

const PermissionsStep = ({
  user,
  role,
  permissions,
  effectivePermissions,
  customize,
  onCustomizeChange,
  onPermissionsChange,
}: AccessStepProps): JSX.Element => (
  <Stack spacing={2}>
    {!user && (
      <Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={customize}
              onChange={(event) => onCustomizeChange(event.target.checked)}
            />
          }
          label="Customize permissions"
        />
        {!customize && (
          <Typography variant="body2" color="text.secondary">
            The invitee will receive the standard permissions for the <strong>{role}</strong> role.
            You can edit their permissions after they accept.
          </Typography>
        )}
      </Box>
    )}
    {customize ? (
      <PermissionMatrix role={role} permissions={permissions} onChange={onPermissionsChange} />
    ) : (
      <PermissionSummary permissions={effectivePermissions} />
    )}
  </Stack>
);

const ReviewStep = ({
  user,
  email,
  role,
  effectivePermissions,
  customize,
}: AccessStepProps): JSX.Element => (
  <Stack spacing={2.5} sx={{ maxWidth: 760 }}>
    <Alert severity="info">
      {user
        ? `Saving will apply these permissions to ${user.name}.`
        : `Sending will email an invitation to ${email}. They will join as an ${role} with the access listed below.`}
    </Alert>
    <Box>
      <Typography variant="overline" color="text.secondary">
        {user ? 'Teammate' : 'Invitee'}
      </Typography>
      {user && <Typography sx={{ fontWeight: 700 }}>{user.name}</Typography>}
      <Typography sx={{ overflowWrap: 'anywhere' }}>{email}</Typography>
      <Chip label={role} size="small" sx={{ mt: 1, textTransform: 'capitalize' }} />
    </Box>
    <Divider />
    <Typography variant="body2" color="text.secondary">
      {customize ? 'Custom resource permissions' : `Standard ${role} permissions`}
    </Typography>
    <PermissionSummary permissions={effectivePermissions} />
  </Stack>
);

const stepContents = [IdentityStep, PermissionsStep, ReviewStep];
const getStepContent = (step: number): typeof IdentityStep => stepContents[step] ?? IdentityStep;

const AccessHeader = ({
  editing,
  disabled,
}: {
  editing: boolean;
  disabled: boolean;
}): JSX.Element => (
  <PageHeader
    title={editing ? 'Manage permissions' : 'Invite user'}
    description={
      editing
        ? "Choose this teammate's role, adjust access, then review your changes."
        : 'Choose who to invite, set their access, then review before sending.'
    }
    icon={editing ? <AdminPanelSettingsRoundedIcon /> : <MailOutlineRoundedIcon />}
    action={
      <Button
        component={RouterLink}
        to="/users"
        startIcon={<ArrowBackRoundedIcon />}
        disabled={disabled}
      >
        Back to users
      </Button>
    }
  />
);

const AccessActions = ({
  step,
  editing,
  pending,
  onBack,
}: {
  step: number;
  editing: boolean;
  pending: boolean;
  onBack: () => void;
}): JSX.Element => {
  const isFinal = step === steps.length - 1;
  const actionLabel = editing ? 'Save permissions' : 'Send invitation';
  const pendingLabel = editing ? 'Saving…' : 'Sending…';
  const finalLabel = pending ? pendingLabel : actionLabel;
  const actionIcon = editing ? <SaveRoundedIcon /> : <SendRoundedIcon />;
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Button
        type="button"
        onClick={onBack}
        disabled={step === 0 || pending}
        startIcon={<ArrowBackRoundedIcon />}
      >
        Back
      </Button>
      <Button
        type="submit"
        variant="contained"
        disabled={pending}
        endIcon={isFinal ? undefined : <ArrowForwardRoundedIcon />}
        startIcon={isFinal ? actionIcon : undefined}
      >
        {isFinal ? finalLabel : 'Continue'}
      </Button>
    </Stack>
  );
};

const AccessForm = ({ user }: { user?: PublicUser }): JSX.Element => {
  const navigate = useNavigate();
  const { user: signedInUser, updateUser } = useAuth();
  const invite = useInviteUser();
  const update = useUpdateUserPermissions();
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'editor');
  const [permissions, setPermissions] = useState<Permission[]>(user?.permissions ?? []);
  const [customize, setCustomize] = useState(Boolean(user));
  const [validationError, setValidationError] = useState<string>();
  const isPending = invite.isPending || update.isPending;
  const effectivePermissions = customize ? permissions : ROLE_TEMPLATES[role];
  const StepContent = getStepContent(step);

  const validateIdentity = (): boolean => {
    if (user) return true;
    const result = inviteUserSchema.pick({ email: true, role: true }).safeParse({ email, role });
    setValidationError(result.success ? undefined : result.error.issues[0]?.message);
    return result.success;
  };

  const changeStep = (next: number): void => {
    if (isPending || (next > step && !validateIdentity())) return;
    setStep(next);
    setMaxStep((current) => Math.max(current, next));
  };

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (isPending) return;
    if (step < steps.length - 1) {
      changeStep(step + 1);
      return;
    }
    if (user) {
      const result = updateUserPermissionsSchema.safeParse({ role, permissions });
      if (!result.success) {
        setValidationError(result.error.issues[0]?.message);
        setStep(1);
        return;
      }
      update.mutate(
        { id: user.id, body: result.data },
        {
          onSuccess: (savedUser) => {
            if (signedInUser?.id === savedUser.id) updateUser(savedUser);
            navigate(
              signedInUser?.id === savedUser.id && savedUser.role !== 'admin' ? '/' : '/users',
            );
          },
        },
      );
      return;
    }
    const result = inviteUserSchema.safeParse({
      email,
      role,
      ...(customize ? { permissions } : {}),
    });
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message);
      setStep(result.error.issues[0]?.path[0] === 'permissions' ? 1 : 0);
      return;
    }
    invite.mutate(result.data);
  };

  if (invite.isSuccess) {
    return (
      <>
        <PageHeader title="Invitation sent" icon={<MailOutlineRoundedIcon />} />
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 3, maxWidth: 760 }}>
          <Stack spacing={2.5} alignItems="flex-start">
            <Alert severity="success">An invitation has been sent to {invite.data.email}.</Alert>
            <Typography color="text.secondary">
              They can follow the link in their email to create an account with the access you
              selected.
            </Typography>
            <Button component={RouterLink} to="/users" variant="contained">
              Back to users
            </Button>
          </Stack>
        </Paper>
      </>
    );
  }

  return (
    <>
      <AccessHeader editing={Boolean(user)} disabled={isPending} />
      <Box component="form" onSubmit={submit} noValidate sx={{ maxWidth: 1080 }}>
        <FormStepNavigation
          steps={steps}
          activeStep={step}
          maxStep={maxStep}
          onStepChange={changeStep}
          disabled={isPending}
        />
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 }, borderRadius: 3, mt: 3 }}>
          <Box
            component="fieldset"
            disabled={isPending}
            sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}
          >
            <Stack spacing={3}>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Step {step + 1} of {steps.length}
                </Typography>
                <Typography component="h2" variant="h5">
                  {steps[step]}
                </Typography>
              </Box>
              <StepContent
                user={user}
                email={email}
                role={role}
                permissions={permissions}
                effectivePermissions={effectivePermissions}
                customize={customize}
                validationError={validationError}
                onEmailChange={(next) => {
                  setEmail(next);
                  setValidationError(undefined);
                }}
                onRoleChange={setRole}
                onCustomizeChange={setCustomize}
                onPermissionsChange={setPermissions}
              />
              {validationError && step !== 0 && <Alert severity="error">{validationError}</Alert>}
              {invite.isError && (
                <Alert severity="error">
                  Could not send invitation. The email may already have an account or an active
                  invitation.
                </Alert>
              )}
              {update.isError && (
                <Alert severity="error">
                  Could not update permissions. At least one administrator must remain.
                </Alert>
              )}
            </Stack>
          </Box>
          <Divider sx={{ my: 3 }} />
          <AccessActions
            step={step}
            editing={Boolean(user)}
            pending={isPending}
            onBack={() => changeStep(step - 1)}
          />
        </Paper>
      </Box>
    </>
  );
};

const PermissionsEditor = ({ userId }: { userId: string }): JSX.Element => {
  const { data: users, isLoading, isError, refetch } = useUsers();
  // Reached with a userId, so this is always the permissions view — the
  // teammate's record is only needed to fill the form, not to title it.
  if (isLoading)
    return (
      <>
        <PageHeader title="Manage permissions" icon={<AdminPanelSettingsRoundedIcon />} />
        <FormPageSkeleton backLink fields={4} />
      </>
    );
  if (isError)
    return (
      <Alert severity="error" action={<Button onClick={() => void refetch()}>Retry</Button>}>
        Could not load this teammate. Please try again.
      </Alert>
    );
  const user = users?.find((item) => item.id === userId);
  if (!user)
    return (
      <Alert
        severity="warning"
        action={
          <Button component={RouterLink} to="/users">
            Back to users
          </Button>
        }
      >
        This user could not be found.
      </Alert>
    );
  return <AccessForm key={user.id} user={user} />;
};

const UserAccessEditor = (): JSX.Element => {
  const { userId } = useParams<{ userId: string }>();
  return userId ? <PermissionsEditor userId={userId} /> : <AccessForm />;
};

export default UserAccessEditor;
