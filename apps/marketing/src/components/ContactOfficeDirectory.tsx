import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { OfficeWatermark } from './OfficeWatermark';

interface OfficeLocation {
  id: string;
  label: string;
  country: string;
  city?: string;
  address: string;
  phone?: string;
  mapUrl?: string;
}

interface ContactOfficeDirectoryProps {
  locations: OfficeLocation[];
  regions: readonly string[];
}

// Tonal surfaces keep the directory calm in both themes, without neon accents.
export const officeDirectoryTones = {
  light: {
    canvas: '#F0F2EA',
    panel: '#E5EADF',
    text: '#324738',
    muted: '#596957',
    accent: '#536E52',
    line: 'rgba(64,85,72,0.18)',
  },
  dark: {
    canvas: '#222A26',
    panel: '#2B3530',
    text: '#DFE2D5',
    muted: '#B7C1B4',
    accent: '#B3C3A7',
    line: 'rgba(191,207,182,0.16)',
  },
} as const;

const officeLinkStyles = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.75,
  color: 'var(--office-text)',
  fontSize: '0.85rem',
  fontWeight: 600,
  textDecorationColor: 'var(--office-line)',
  textUnderlineOffset: '4px',
  '&:hover': { textDecorationColor: 'currentColor' },
  '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: 5, borderRadius: 0.5 },
} as const;

const OfficeEntry = ({ location }: { location: OfficeLocation }): JSX.Element => (
  <Box
    component="article"
    aria-label={location.label}
    sx={{ position: 'relative', overflow: 'hidden', minWidth: 0, p: { xs: 2.75, md: 3.5 } }}
  >
    <OfficeWatermark
      variant="streets"
      sx={{
        position: 'absolute',
        width: 240,
        right: -65,
        top: -35,
        color: 'var(--office-accent)',
        opacity: 0.22,
        maskImage: 'linear-gradient(to right, transparent, black 70%)',
      }}
    />
    <Box sx={{ position: 'relative' }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <PlaceOutlinedIcon aria-hidden sx={{ color: 'var(--office-accent)', fontSize: 18 }} />
        <Typography
          variant="overline"
          sx={{
            color: 'var(--office-accent)',
            fontSize: '0.69rem',
            fontWeight: 650,
            letterSpacing: 1.7,
          }}
        >
          {location.country}
          {location.city ? ` · ${location.city}` : ''}
        </Typography>
      </Stack>
      <Typography
        component="h3"
        variant="h5"
        sx={{
          mt: 1.25,
          color: 'var(--office-text)',
          fontWeight: 600,
          fontSize: { xs: '1.4rem', md: '1.55rem' },
        }}
      >
        {location.label}
      </Typography>
      <Typography
        component="address"
        sx={{
          maxWidth: 490,
          mt: 1,
          color: 'var(--office-muted)',
          fontSize: '0.96rem',
          fontStyle: 'normal',
          lineHeight: 1.7,
          overflowWrap: 'anywhere',
        }}
      >
        {location.address}
      </Typography>
      {(location.phone || location.mapUrl) && (
        <Stack direction="row" useFlexGap flexWrap="wrap" gap={2.5} sx={{ mt: 2 }}>
          {location.phone && (
            <Link href={`tel:${location.phone.replace(/\s/g, '')}`} sx={officeLinkStyles}>
              <PhoneRoundedIcon aria-hidden sx={{ fontSize: 16 }} />
              {location.phone}
            </Link>
          )}
          {location.mapUrl && (
            <Link
              href={location.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Get directions to ${location.label}`}
              sx={officeLinkStyles}
            >
              Get directions
              <ArrowOutwardRoundedIcon aria-hidden sx={{ fontSize: 16 }} />
            </Link>
          )}
        </Stack>
      )}
    </Box>
  </Box>
);

export const ContactOfficeDirectory = ({
  locations,
  regions,
}: ContactOfficeDirectoryProps): JSX.Element => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.85fr) minmax(0, 1.35fr)' },
      alignItems: 'stretch',
      gap: { xs: 4, md: 7, lg: 9 },
    }}
  >
    <Box
      sx={{ position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <OfficeWatermark
        variant="atlas"
        sx={{
          position: 'absolute',
          width: 350,
          right: -90,
          bottom: -100,
          color: 'var(--office-accent)',
          opacity: 0.16,
        }}
      />
      <Box sx={{ position: 'relative' }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box sx={{ width: 28, height: '1px', bgcolor: 'var(--office-accent)' }} />
          <Typography
            variant="overline"
            sx={{
              color: 'var(--office-accent)',
              fontWeight: 650,
              fontSize: '0.7rem',
              letterSpacing: 2,
            }}
          >
            Find us
          </Typography>
        </Stack>
        <Typography
          id="contact-locations-title"
          component="h2"
          variant="h2"
          sx={{
            mt: 2,
            maxWidth: 430,
            color: 'var(--office-text)',
            fontSize: { xs: '2.15rem', md: '2.9rem' },
            lineHeight: 1.12,
            fontWeight: 500,
          }}
        >
          Closer to your community.
        </Typography>
        <Typography
          sx={{
            mt: 2,
            maxWidth: 340,
            color: 'var(--office-muted)',
            fontSize: '0.96rem',
            lineHeight: 1.7,
          }}
        >
          Find an office and connect with the people behind our work.
        </Typography>
      </Box>
      <Box sx={{ position: 'relative', mt: 'auto', pt: { xs: 3, md: 4 } }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.75}
          sx={{ color: 'var(--office-muted)' }}
        >
          <PublicRoundedIcon aria-hidden sx={{ fontSize: 16 }} />
          <Typography variant="caption" sx={{ fontWeight: 500, letterSpacing: 0.4 }}>
            Regional presence
          </Typography>
        </Stack>
        <Box
          component="ul"
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 22px',
            p: 0,
            mt: 1,
            mb: 0,
            listStyle: 'none',
          }}
        >
          {regions.map((region) => (
            <Box component="li" key={region} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                aria-hidden
                sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'var(--office-accent)' }}
              />
              <Typography variant="body2" sx={{ color: 'var(--office-text)', fontWeight: 500 }}>
                {region}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>

    <Box
      sx={{
        minWidth: 0,
        alignSelf: 'center',
        width: '100%',
        overflow: 'hidden',
        bgcolor: 'var(--office-panel)',
        border: '1px solid var(--office-line)',
        borderRadius: 3,
        '& > article + article': { borderTop: '1px solid var(--office-line)' },
      }}
    >
      {locations.map((location) => (
        <OfficeEntry key={location.id} location={location} />
      ))}
    </Box>
  </Box>
);
