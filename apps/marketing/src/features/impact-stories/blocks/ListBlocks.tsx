import type { ImpactStat } from '@iaa/shared';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { ImpactMetricsGrid } from '../../../components/ImpactMetrics';
import { cloudinaryUrl } from '../../../lib/cloudinary-image';
import { storyLinkTarget } from '../story-utils';

import { BlockFrame, BlockHeading, type StoryBlockProps } from './frame';

/**
 * Headline numbers, in the same cards and count-up as the site's own impact
 * figures, so a story's results read like the organisation's.
 */
export const MetricsBlock = ({ data }: StoryBlockProps<'metrics'>): JSX.Element => {
  const stats: ImpactStat[] = data.items.map((item, index) => ({
    id: `story-metric-${index}`,
    key: item.label,
    label: item.label,
    value: item.value,
    suffix: item.suffix ?? '',
    order: index,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  }));
  return (
    <BlockFrame width="wide">
      {data.heading && <BlockHeading>{data.heading}</BlockHeading>}
      <ImpactMetricsGrid stats={stats} />
    </BlockFrame>
  );
};

/** Steps in order, each with when it happened and what happened. */
export const TimelineBlock = ({ data }: StoryBlockProps<'timeline'>): JSX.Element => (
  <BlockFrame width="text">
    {data.heading && <BlockHeading>{data.heading}</BlockHeading>}
    <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {data.items.map((item, index) => (
        <Box
          component="li"
          key={`${item.label}-${index}`}
          sx={{
            position: 'relative',
            pl: { xs: 4, md: 5 },
            pb: index === data.items.length - 1 ? 0 : 4,
            // The rail joining one step to the next.
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 7,
              top: 18,
              bottom: 0,
              width: 2,
              bgcolor: index === data.items.length - 1 ? 'transparent' : 'divider',
            },
          }}
        >
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              left: 0,
              top: 4,
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: 3,
              borderColor: 'secondary.main',
              bgcolor: 'background.paper',
            }}
          />
          <Typography
            variant="overline"
            sx={{ display: 'block', color: 'text.secondary', fontWeight: 750, lineHeight: 1.6 }}
          >
            {item.label}
          </Typography>
          <Typography component="h3" variant="h6" sx={{ fontWeight: 750 }}>
            {item.title}
          </Typography>
          {item.description && (
            <Typography color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.75 }}>
              {item.description}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  </BlockFrame>
);

/** A link a story may carry: on this site through the router, elsewhere in a new tab. */
export const StoryLink = ({
  url,
  children,
  label,
}: {
  url: string | undefined;
  children: ReactNode;
  /** The accessible name when the visible content is only a picture. */
  label?: string;
}): JSX.Element => {
  const target = storyLinkTarget(url);
  if (!target) return <>{children}</>;
  if (target.kind === 'internal') {
    return (
      <Link component={RouterLink} to={target.to} aria-label={label} underline="hover">
        {children}
      </Link>
    );
  }
  return (
    <Link
      href={target.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      underline="hover"
    >
      {children}
    </Link>
  );
};

/** The organisations the work was done with: a logo where there is one, the name always. */
export const PartnersBlock = ({ data }: StoryBlockProps<'partners'>): JSX.Element => (
  <BlockFrame width="wide">
    {data.heading && <BlockHeading>{data.heading}</BlockHeading>}
    <Box
      component="ul"
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(3, minmax(0, 1fr))',
          md: 'repeat(4, minmax(0, 1fr))',
        },
        m: 0,
        p: 0,
        listStyle: 'none',
      }}
    >
      {data.items.map((partner, index) => (
        <Box
          component="li"
          key={`${partner.name}-${index}`}
          sx={{
            display: 'grid',
            placeItems: 'center',
            minHeight: 120,
            p: 2,
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'background.paper',
            textAlign: 'center',
          }}
        >
          <StoryLink url={partner.url} label={partner.logo ? partner.name : undefined}>
            {partner.logo ? (
              <Box
                component="img"
                src={cloudinaryUrl(partner.logo.url, { width: 320 })}
                // The partner's name is the logo's description, whatever alt was stored.
                alt={partner.name}
                loading="lazy"
                decoding="async"
                sx={{ display: 'block', maxWidth: '100%', maxHeight: 64, objectFit: 'contain' }}
              />
            ) : (
              <Typography component="span" sx={{ fontWeight: 750, color: 'text.primary' }}>
                {partner.name}
              </Typography>
            )}
          </StoryLink>
        </Box>
      ))}
    </Box>
  </BlockFrame>
);
