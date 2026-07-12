import {
  ADMIN_RESOURCES,
  PERMISSION_ACTIONS,
  ROLE_TEMPLATES,
  type AdminResource,
  type Permission,
  type PermissionAction,
  type UserRole,
} from '@iaa/shared';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

const resourceLabel = (resource: AdminResource): string =>
  resource
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const actionLabel = (action: PermissionAction): string => action.charAt(0).toUpperCase() + action.slice(1);

interface PermissionMatrixProps {
  role: UserRole;
  permissions: Permission[];
  onChange: (permissions: Permission[]) => void;
}

export const PermissionMatrix = ({ role, permissions, onChange }: PermissionMatrixProps): JSX.Element => {
  const hasPermission = (resource: AdminResource, action: PermissionAction): boolean =>
    permissions.includes(`${resource}:${action}`);

  const toggle = (resource: AdminResource, action: PermissionAction): void => {
    const permission = `${resource}:${action}` as Permission;
    if (permissions.includes(permission)) {
      onChange(permissions.filter((p) => p !== permission));
    } else {
      onChange([...permissions, permission]);
    }
  };

  const toggleResource = (resource: AdminResource): void => {
    const allActions = PERMISSION_ACTIONS.map((action) => `${resource}:${action}` as Permission);
    const allSelected = allActions.every((p) => permissions.includes(p));
    if (allSelected) {
      onChange(permissions.filter((p) => !allActions.includes(p)));
    } else {
      onChange(Array.from(new Set([...permissions, ...allActions])));
    }
  };

  const toggleAction = (action: PermissionAction): void => {
    const allPermissions = ADMIN_RESOURCES.map((resource) => `${resource}:${action}` as Permission);
    const allSelected = allPermissions.every((p) => permissions.includes(p));
    if (allSelected) {
      onChange(permissions.filter((p) => !allPermissions.includes(p)));
    } else {
      onChange(Array.from(new Set([...permissions, ...allPermissions])));
    }
  };

  const resetToRole = (): void => {
    onChange(ROLE_TEMPLATES[role]);
  };

  const divergesFromRole =
    JSON.stringify([...permissions].sort()) !== JSON.stringify([...ROLE_TEMPLATES[role]].sort());

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
          Resource permissions
        </Typography>
        <Button size="small" onClick={resetToRole} disabled={!divergesFromRole}>
          Reset to {role} defaults
        </Button>
      </Box>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Resource</TableCell>
              {PERMISSION_ACTIONS.map((action) => (
                <TableCell key={action} align="center" sx={{ fontWeight: 600 }}>
                  <Checkbox
                    size="small"
                    checked={ADMIN_RESOURCES.every((resource) => hasPermission(resource, action))}
                    indeterminate={
                      ADMIN_RESOURCES.some((resource) => hasPermission(resource, action)) &&
                      !ADMIN_RESOURCES.every((resource) => hasPermission(resource, action))
                    }
                    onChange={() => toggleAction(action)}
                    slotProps={{ input: { 'aria-label': `Toggle all ${action} permissions` } }}
                  />
                  <Box sx={{ display: 'block', fontSize: '0.75rem' }}>{actionLabel(action)}</Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {ADMIN_RESOURCES.map((resource) => (
              <TableRow key={resource} hover>
                <TableCell sx={{ fontWeight: 500 }}>
                  <Checkbox
                    size="small"
                    checked={PERMISSION_ACTIONS.every((action) => hasPermission(resource, action))}
                    indeterminate={
                      PERMISSION_ACTIONS.some((action) => hasPermission(resource, action)) &&
                      !PERMISSION_ACTIONS.every((action) => hasPermission(resource, action))
                    }
                    onChange={() => toggleResource(resource)}
                    slotProps={{
                      input: { 'aria-label': `Toggle all permissions for ${resourceLabel(resource)}` },
                    }}
                  />
                  {resourceLabel(resource)}
                </TableCell>
                {PERMISSION_ACTIONS.map((action) => (
                  <TableCell key={action} align="center">
                    <Checkbox
                      size="small"
                      checked={hasPermission(resource, action)}
                      onChange={() => toggle(resource, action)}
                      slotProps={{
                        input: { 'aria-label': `${actionLabel(action)} ${resourceLabel(resource)}` },
                      }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
