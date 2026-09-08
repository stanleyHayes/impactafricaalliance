import { brandColors, type PublicReachSummary } from '@iaa/shared';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { usePublicReach } from '../lib/content-hooks';
import { drawReachCard } from '../lib/reach-card';

import { Section } from './Section';
import { SectionReveal } from './SectionReveal';

const number = new Intl.NumberFormat('en-GB');

/**
 * Below this the figures say more about the week than about the work, so the
 * card stays hidden rather than announcing that four people visited.
 */
const MIN_VIEWS_TO_SHOW = 50;

const SITE_LABEL = 'impactafricaalliance.org';

const Figure = ({ value, label }: { value: string; label: string }): JSX.Element => (
  <Box>
    <Typography
      sx={{
        fontSize: { xs: '2.2rem', md: '3rem' },
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        color: brandColors.white,
      }}
    >
      {value}
    </Typography>
    <Typography variant="body2" sx={{ mt: 0.5, color: brandColors.mint, fontWeight: 600 }}>
      {label}
    </Typography>
  </Box>
);

/** The daily series, drawn as a sparkline so the card has a shape not just numbers. */
const Trend = ({ reach }: { reach: PublicReachSummary }): JSX.Element => {
  const peak = Math.max(...reach.daily.map((day) => day.views), 1);
  return (
    <Stack direction="row" spacing={0.4} alignItems="flex-end" sx={{ height: 64, mt: 3 }}>
      {reach.daily.map((day) => (
        <Box
          key={day.date}
          title={`${day.date}: ${number.format(day.views)} views`}
          sx={{
            flex: 1,
            minWidth: 2,
            height: `${Math.max(4, (day.views / peak) * 100)}%`,
            borderRadius: 0.5,
            bgcolor: brandColors.mint,
            opacity: 0.35 + 0.65 * (day.views / peak),
          }}
        />
      ))}
    </Stack>
  );
};

/**
 * Whether this browser can hand a file to another app. Phones can, so the
 * button offers to share; desktops cannot, so it offers to save — and the
 * label should say which before it is pressed.
 */
const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';

const ReachPanel = ({ reach }: { reach: PublicReachSummary }): JSX.Element => {
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const share = async (): Promise<void> => {
    setBusy(true);
    try {
      const blob = await drawReachCard(reach, SITE_LABEL);
      if (!blob) {
        setNotice('This browser could not draw the card.');
        return;
      }
      const file = new File([blob], 'impact-africa-alliance-reach.png', { type: 'image/png' });

      // Share the file itself where the browser allows it; otherwise save it,
      // which is what a desktop wants anyway before posting.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Impact Africa Alliance — reach',
          text: `${number.format(reach.totalViews)} page views from ${number.format(reach.countryCount)} countries in the last ${reach.days} days.`,
        });
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
      setNotice('Card saved — ready to post.');
    } catch (error) {
      // A cancelled share is not a failure worth reporting.
      if ((error as Error)?.name !== 'AbortError') {
        setNotice('The card could not be created.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Box
        sx={{
          p: { xs: 3, md: 4.5 },
          borderRadius: 4,
          bgcolor: brandColors.deepForest,
          border: `1px solid ${alpha(brandColors.mint, 0.3)}`,
          color: brandColors.white,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ color: brandColors.gold, fontWeight: 800, letterSpacing: 1.4 }}
            >
              Last {reach.days} days
            </Typography>
            <Typography sx={{ fontSize: { xs: '1.5rem', md: '1.9rem' }, fontWeight: 600, mt: 0.5 }}>
              Who is reading our work
            </Typography>
          </Box>
          <Button
            onClick={() => void share()}
            disabled={busy}
            variant="contained"
            color="secondary"
            startIcon={canShareFiles ? <IosShareRoundedIcon /> : <DownloadRoundedIcon />}
            sx={{ fontWeight: 700, flexShrink: 0 }}
          >
            {busy ? 'Preparing…' : 'Share these figures'}
          </Button>
        </Stack>

        <Stack direction="row" spacing={{ xs: 3, md: 6 }} sx={{ mt: 3, flexWrap: 'wrap' }}>
          <Figure value={number.format(reach.totalViews)} label="page views" />
          <Figure value={number.format(reach.totalVisitors)} label="people" />
          <Figure value={number.format(reach.countryCount)} label="countries" />
        </Stack>

        {reach.topCountries.length > 0 && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2.5 }}>
            <PublicRoundedIcon sx={{ fontSize: 18, color: brandColors.mint }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
              {reach.topCountries.slice(0, 5).map((country) => country.label).join(' · ')}
            </Typography>
          </Stack>
        )}

        <Trend reach={reach} />
      </Box>
      <Snackbar
        open={notice !== ''}
        autoHideDuration={4000}
        onClose={() => setNotice('')}
        message={notice}
      />
    </>
  );
};

/**
 * Reach, as something a partner can be shown rather than told.
 *
 * The share button hands over the same figures as a branded PNG at the size
 * every network crops previews to, so the evidence travels with the claim.
 */
export const ReachSection = (): JSX.Element | null => {
  const { data, isLoading } = usePublicReach(30);

  if (isLoading) {
    return (
      <Section eyebrow="Our reach" title="The work, in numbers.">
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 4 }} />
      </Section>
    );
  }
  // Nothing to boast about yet is a reason to say nothing, not to show a zero.
  if (!data || data.totalViews < MIN_VIEWS_TO_SHOW) return null;

  return (
    <Section
      eyebrow="Our reach"
      title="The work, in numbers."
      subtitle="Traffic to this site over the last month. Share the card with partners, funders, or anyone who asks what reach looks like."
    >
      <SectionReveal>
        <ReachPanel reach={data} />
      </SectionReveal>
    </Section>
  );
};
