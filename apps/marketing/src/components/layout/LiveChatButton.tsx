import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { useSiteSettings } from '../../lib/content-hooks';

const DEFAULT_LABEL = 'Chat with us';
const DEFAULT_GREETING = "Hello Impact Africa Alliance, I'd like to ask about";

/** WhatsApp deep link with the greeting pre-filled, so the visitor starts mid-sentence. */
const toChatHref = (phone: string, greeting: string): string =>
  `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(greeting)}`;

/**
 * Floating chat launcher. Routes to WhatsApp rather than embedding a hosted
 * widget: the number already exists, there is no third-party script to load or
 * consent to gather, and replies land where the team already works.
 */
export const LiveChatButton = (): JSX.Element | null => {
  const { data } = useSiteSettings();
  const chat = data?.liveChat;
  const phone = data?.whatsappPhone ?? data?.contactPhone;

  if (!chat?.enabled || !phone) {
    return null;
  }

  const label = chat.label || DEFAULT_LABEL;

  return (
    <Tooltip title={label} placement="left">
      <Fab
        component="a"
        href={toChatHref(phone, chat.greeting || DEFAULT_GREETING)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        variant="extended"
        sx={{
          position: 'fixed',
          // Bottom-left on purpose: the cookie banner owns the bottom-right
          // corner, and overlapping it made this button unclickable on a first
          // visit — exactly when someone is most likely to want to ask.
          left: { xs: 16, md: 24 },
          bottom: { xs: 16, md: 24 },
          zIndex: (theme) => theme.zIndex.speedDial,
          gap: 1,
          bgcolor: '#25D366',
          color: '#04231A',
          fontWeight: 750,
          boxShadow: '0 16px 34px -18px rgba(0,0,0,0.55)',
          '&:hover': { bgcolor: '#1FB855' },
        }}
      >
        <WhatsAppIcon />
        <Typography
          component="span"
          sx={{ display: { xs: 'none', sm: 'inline' }, fontSize: '0.9rem', fontWeight: 750 }}
        >
          {label}
        </Typography>
      </Fab>
    </Tooltip>
  );
};
