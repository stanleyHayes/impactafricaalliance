import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PeopleOutlineRoundedIcon from '@mui/icons-material/PeopleOutlineRounded';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

const detailIcon = (label: string): JSX.Element => {
  if (/date|deadline|start|end|time|created|updated/i.test(label))
    return <CalendarMonthRoundedIcon />;
  if (/email/i.test(label)) return <EmailOutlinedIcon />;
  if (/phone|mobile/i.test(label)) return <PhoneOutlinedIcon />;
  if (/location|venue|country|address/i.test(label)) return <LocationOnOutlinedIcon />;
  if (/link|url|website/i.test(label)) return <LinkRoundedIcon />;
  if (/name|people|capacity|author|member|organization/i.test(label))
    return <PeopleOutlineRoundedIcon />;
  if (/status|registration|enabled|published/i.test(label)) return <TaskAltRoundedIcon />;
  if (/type|category|admission|amount|price/i.test(label)) return <SellOutlinedIcon />;
  return <DescriptionOutlinedIcon />;
};

/** A scannable label/value pair with a consistent semantic icon. */
export const InformationItem = ({
  label,
  children,
  icon,
}: {
  label: string;
  children: ReactNode;
  icon?: ReactNode;
}): JSX.Element => (
  <Box
    component="div"
    sx={{ m: 0, display: 'flex', alignItems: 'flex-start', gap: 1.5, minWidth: 0 }}
  >
    <Box
      aria-hidden
      sx={{
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        width: 36,
        height: 36,
        borderRadius: 1.5,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.09),
        color: 'text.secondary',
        '& svg': { fontSize: 19 },
      }}
    >
      {icon ?? detailIcon(label)}
    </Box>
    <Box component="dl" sx={{ m: 0, minWidth: 0, flex: 1 }}>
      <Typography
        component="dt"
        variant="caption"
        sx={{ color: 'text.secondary', fontWeight: 600 }}
      >
        {label}
      </Typography>
      <Typography
        component="dd"
        variant="body2"
        sx={{
          m: 0,
          mt: 0.5,
          fontWeight: 600,
          overflowWrap: 'anywhere',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.65,
        }}
      >
        {children}
      </Typography>
    </Box>
  </Box>
);
