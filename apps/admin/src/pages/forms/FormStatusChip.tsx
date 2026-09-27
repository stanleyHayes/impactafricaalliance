import type { FormStatus } from '@iaa/shared';
import Chip, { type ChipProps } from '@mui/material/Chip';

const LOOKS: Record<FormStatus | 'archived', { label: string; color: ChipProps['color'] }> = {
  draft: { label: 'Draft', color: 'default' },
  published: { label: 'Published', color: 'success' },
  closed: { label: 'Closed', color: 'warning' },
  archived: { label: 'Archived', color: 'default' },
};

/**
 * A form's status as a chip. An archived form shows as archived whatever its
 * status, since archiving is what the reader needs to know first.
 */
export const FormStatusChip = ({
  status,
  archived = false,
  size = 'small',
}: {
  status: FormStatus;
  archived?: boolean;
  size?: ChipProps['size'];
}): JSX.Element => {
  const look = LOOKS[archived ? 'archived' : status];
  return (
    <Chip
      size={size}
      label={look.label}
      color={look.color}
      variant={archived ? 'outlined' : 'filled'}
      sx={{ fontWeight: 600 }}
    />
  );
};
