import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import { useColorMode } from '../../theme/ColorModeContext';

export const ThemeToggle = (): JSX.Element => {
  const { mode, toggleColorMode } = useColorMode();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    const x = event.clientX;
    const y = event.clientY;
    document.documentElement.style.setProperty('--reveal-x', `${x}px`);
    document.documentElement.style.setProperty('--reveal-y', `${y}px`);

    if ('startViewTransition' in document && document.startViewTransition) {
      document.startViewTransition(toggleColorMode);
    } else {
      toggleColorMode();
    }
  };

  return (
    <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
      <IconButton
        onClick={handleClick}
        aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        sx={{
          width: 40,
          height: 40,
          border: 1,
          borderColor: 'divider',
          color: 'text.secondary',
          bgcolor: 'background.paper',
          '&:hover': { color: 'primary.main', borderColor: 'primary.main' },
        }}
      >
        {mode === 'light' ? <DarkModeRoundedIcon fontSize="small" /> : <LightModeRoundedIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
};
