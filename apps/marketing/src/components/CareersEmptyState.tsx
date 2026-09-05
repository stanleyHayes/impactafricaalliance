import { ORG } from '@iaa/shared';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import { Box, Button, Chip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

import { Watermark } from './Watermark';

export const CareersEmptyState = (): JSX.Element => (
  <Box
    component="section"
    aria-label="Career opportunities"
    sx={{
      position: 'relative',
      overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
      border: 1,
      borderColor: 'divider',
      borderRadius: 4,
    }}
  >
    <Box sx={{ p: { xs: 3, md: 4 }, position: 'relative' }}>
      <BusinessCenterOutlinedIcon
        aria-hidden
        sx={{
          position: 'absolute',
          right: 20,
          bottom: -22,
          fontSize: 190,
          opacity: 0.045,
          transform: 'rotate(-12deg)',
          pointerEvents: 'none',
        }}
      />
      <Chip
        icon={<BusinessCenterOutlinedIcon />}
        label="No open roles right now"
        size="small"
        variant="outlined"
        sx={{ mb: 2.5, color: 'text.secondary', borderColor: 'divider' }}
      />
      <Typography
        variant="h4"
        component="h3"
        sx={{ maxWidth: 350, fontSize: { xs: '1.65rem', md: '2rem' }, lineHeight: 1.2 }}
      >
        Your next chapter could start here.
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 430 }}>
        We’re always keen to meet people who want to expand opportunity across Africa. Tell us what
        you could bring to the Alliance.
      </Typography>
    </Box>
    <Box
      sx={{
        p: { xs: 3, md: 4 },
        position: 'relative',
        overflow: 'hidden',
        borderLeftWidth: { xs: 0, md: 1 },
        borderLeftStyle: 'solid',
        borderTopWidth: { xs: 1, md: 0 },
        borderTopStyle: 'solid',
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.text.secondary, 0.05),
        '& > :not([aria-hidden])': { position: 'relative', zIndex: 1 },
      }}
    >
      <Watermark
        variant="network"
        size={260}
        opacity={0.06}
        sx={{ color: 'text.secondary', animation: 'none' }}
      />
      <Typography variant="overline" color="text.secondary">
        Let’s get acquainted
      </Typography>
      <Typography variant="h6" component="h4" sx={{ mt: 0.5 }}>
        Introduce yourself
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', my: 1.5 }}>
        <DescriptionOutlinedIcon sx={{ mt: 0.4, fontSize: 20, color: 'text.secondary' }} />
        <Typography variant="body2" color="text.secondary">
          Send your CV and a brief motivation letter. We’ll be in touch if a suitable opportunity
          arises.
        </Typography>
      </Box>
      <Button
        component="a"
        href={`mailto:${ORG.careersEmail}`}
        variant="outlined"
        color="inherit"
        startIcon={<MailOutlineRoundedIcon />}
        endIcon={<ArrowOutwardRoundedIcon />}
        sx={{ mt: 0.5, borderColor: 'divider', color: 'text.primary' }}
      >
        Email our team
      </Button>
      <Typography
        component="a"
        href={`mailto:${ORG.careersEmail}`}
        variant="caption"
        sx={{
          display: 'block',
          mt: 1.5,
          color: 'text.secondary',
          overflowWrap: 'anywhere',
          textUnderlineOffset: 3,
        }}
      >
        {ORG.careersEmail}
      </Typography>
    </Box>
  </Box>
);
