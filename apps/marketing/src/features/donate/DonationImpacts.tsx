import {
  DONATION_CURRENCY_RULES,
  DONATION_TIERS,
  DonationCurrency,
  formatMoney,
  type DonationTier,
} from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import { Box, ButtonBase, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

const rowSx = {
  width: '100%',
  display: 'grid',
  // ButtonBase centres its content; a plain row has to ask.
  alignItems: 'center',
  gap: { xs: 1, sm: 1.5 },
  textAlign: 'left',
  p: 1.75,
  borderBottom: 1,
  borderColor: 'divider',
  color: 'text.primary',
} as const;

const TierText = ({ tier }: { tier: DonationTier }): JSX.Element => (
  <>
    <Typography sx={{ fontSize: '1.15rem', fontWeight: 750 }}>
      {formatMoney(tier.amountUsd, DonationCurrency.USD)}
    </Typography>
    <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
      {tier.impact}
    </Typography>
  </>
);

/** A tier that fills in its amount: only for a dollar gift, since tiers are costed in dollars. */
const SelectableTier = ({
  tier,
  selected,
  onSelect,
}: {
  tier: DonationTier;
  selected: boolean;
  onSelect: (amount: number) => void;
}): JSX.Element => (
  <ButtonBase
    onClick={() => onSelect(tier.amountUsd)}
    aria-pressed={selected}
    aria-label={`Give ${formatMoney(tier.amountUsd, DonationCurrency.USD)}: ${tier.impact}`}
    sx={{
      ...rowSx,
      gridTemplateColumns: '82px 1fr 20px',
      borderLeft: '2px solid',
      borderLeftColor: selected ? 'text.secondary' : 'transparent',
      bgcolor: (t) => (selected ? alpha(t.palette.text.secondary, 0.09) : 'transparent'),
      '&:hover': { bgcolor: (t) => alpha(t.palette.text.secondary, 0.07) },
      '&.Mui-focusVisible': {
        outline: '2px solid',
        outlineColor: 'text.secondary',
        outlineOffset: -2,
      },
    }}
  >
    <TierText tier={tier} />
    {selected ? (
      <CheckRoundedIcon sx={{ fontSize: 19 }} />
    ) : (
      <ArrowForwardRoundedIcon sx={{ fontSize: 17, color: 'text.secondary' }} />
    )}
  </ButtonBase>
);

export const DonationImpacts = ({
  amount,
  currency,
  onSelect,
}: {
  amount: number;
  /** The currency of the gift being made; the tiers only fill in a dollar gift. */
  currency: DonationCurrency;
  onSelect: (amount: number) => void;
}): JSX.Element => {
  const selectable = currency === DonationCurrency.USD;
  return (
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
        {selectable
          ? 'Choose a gift below or set your own amount. These examples show what your support makes possible.'
          : 'These examples show what your support makes possible. Set your own amount in the form.'}
      </Typography>
      <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
        {DONATION_TIERS.map((tier) =>
          selectable ? (
            <SelectableTier
              key={tier.amountUsd}
              tier={tier}
              selected={amount === tier.amountUsd}
              onSelect={onSelect}
            />
          ) : (
            <Box key={tier.amountUsd} sx={{ ...rowSx, gridTemplateColumns: '82px 1fr' }}>
              <TierText tier={tier} />
            </Box>
          ),
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        {selectable
          ? 'All amounts are in US dollars.'
          : `These examples are costed in US dollars; your gift is in ${DONATION_CURRENCY_RULES[currency].name}.`}
      </Typography>
    </Box>
  );
};
