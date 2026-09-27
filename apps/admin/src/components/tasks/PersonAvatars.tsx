import type { PersonSummary } from '@iaa/shared';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import { alpha } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { initials } from '../../lib/initials';

/**
 * The people on a task as overlapping initials, with each name on hover and
 * all of them in the accessible label. "Unassigned" when there is nobody.
 */
export const PersonAvatars = ({
  people,
  max = 3,
  size = 26,
}: {
  people: readonly PersonSummary[];
  max?: number;
  size?: number;
}): JSX.Element => {
  if (people.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        Unassigned
      </Typography>
    );
  }
  return (
    <AvatarGroup
      max={max}
      role="img"
      aria-label={`Assigned to ${people.map((person) => person.name).join(', ')}`}
      sx={{
        justifyContent: 'flex-end',
        '& .MuiAvatar-root': { width: size, height: size, fontSize: size * 0.4, fontWeight: 750 },
      }}
    >
      {people.map((person) => (
        <Tooltip key={person.id} title={person.name}>
          <Avatar
            aria-hidden
            sx={{
              color: 'text.primary',
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
            }}
          >
            {initials(person.name)}
          </Avatar>
        </Tooltip>
      ))}
    </AvatarGroup>
  );
};
