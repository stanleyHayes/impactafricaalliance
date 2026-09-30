import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';

import { skinned, tokenVar } from '../../theme/surfaces';

import type { ViewMode } from './useViewMode';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/**
 * Compact table/grid view switcher used on every admin list page.
 *
 * Classic draws it as a small paper box with a hairline. In a skin it is the
 * skin's segmented control (the theme's toggle group: a well with the chosen
 * view raised or filled in it), so the box's own paper and hairline give way.
 */
export const ViewToggle = ({ value, onChange }: ViewToggleProps): JSX.Element => (
  <ToggleButtonGroup
    exclusive
    size="small"
    value={value}
    onChange={(_event, next: ViewMode | null) => {
      if (next) {
        onChange(next);
      }
    }}
    aria-label="Switch between table and grid view"
    sx={skinned(
      {
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        '& .MuiToggleButton-root': { px: 1.25, py: 0.5, border: 'none' },
      },
      {
        bgcolor: tokenVar('segmentBg'),
        border: tokenVar('surfaceInsetBorder'),
        borderRadius: tokenVar('controlRadius'),
      },
    )}
  >
    <ToggleButton value="table" aria-label="Table view">
      <Tooltip title="Table view">
        <TableRowsOutlinedIcon fontSize="small" />
      </Tooltip>
    </ToggleButton>
    <ToggleButton value="grid" aria-label="Grid view">
      <Tooltip title="Grid view">
        <GridViewOutlinedIcon fontSize="small" />
      </Tooltip>
    </ToggleButton>
  </ToggleButtonGroup>
);
