import { DONATION_TIERS } from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import { Box, ButtonBase, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

export const DonationImpacts = ({
  amount,
  onSelect,
}: {
  amount: number;
  onSelect: (amount: number) => void;
}): JSX.Element => (
  <Box
    component="section"
    aria-label="What your gift can support"
    sx={{ position: 'relative', overflow: 'hidden' }}
  >
    <VolunteerActivismOutlinedIcon
      aria-hidden
      sx={{
        position: 'absolute',
        right: -28,
        top: -35,
        fontSize: 200,
        opacity: 0.045,
        pointerEvents: 'none',
        transform: 'rotate(-12deg)',
      }}
    />
    <Typography variant="overline" color="text.secondary">
      What your gift can do
    </Typography>
    <Typography
      variant="h4"
      component="h3"
      sx={{ mt: 0.75, maxWidth: 340, fontSize: { xs: '1.65rem', md: '2rem' }, lineHeight: 1.2 }}
    >
      Small beginnings.
      <br />
      Lasting opportunity.
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 2.5, maxWidth: 390 }}>
      Choose a gift below or set your own amount. These examples show what your support makes
      possible.
    </Typography>
    <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
      {DONATION_TIERS.map((tier) => (
        <ButtonBase
          key={tier.amountUsd}
          onClick={() => onSelect(tier.amountUsd)}
          aria-pressed={amount === tier.amountUsd}
          aria-label={`Give $${tier.amountUsd.toLocaleString('en-US')}: ${tier.impact}`}
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '82px 1fr 20px',
            gap: { xs: 1, sm: 1.5 },
            textAlign: 'left',
            p: 1.75,
            borderBottom: 1,
            borderColor: 'divider',
            borderLeft: '2px solid',
            borderLeftColor: amount === tier.amountUsd ? 'text.secondary' : 'transparent',
            bgcolor: (t) =>
              amount === tier.amountUsd ? alpha(t.palette.text.secondary, 0.09) : 'transparent',
            color: 'text.primary',
            '&:hover': { bgcolor: (t) => alpha(t.palette.text.secondary, 0.07) },
            '&.Mui-focusVisible': {
              outline: '2px solid',
              outlineColor: 'text.secondary',
              outlineOffset: -2,
            },
          }}
        >
          <Typography sx={{ fontSize: '1.15rem', fontWeight: 750 }}>
            ${tier.amountUsd.toLocaleString('en-US')}
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
            {tier.impact}
          </Typography>
          {amount === tier.amountUsd ? (
            <CheckRoundedIcon sx={{ fontSize: 19 }} />
          ) : (
            <ArrowForwardRoundedIcon sx={{ fontSize: 17, color: 'text.secondary' }} />
          )}
        </ButtonBase>
      ))}
    </Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
      All amounts are in US dollars.
    </Typography>
  </Box>
);
