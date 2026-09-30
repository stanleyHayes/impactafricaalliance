import type { AdminResource } from '@iaa/shared';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CollectionsOutlinedIcon from '@mui/icons-material/CollectionsOutlined';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { useCan } from '../../auth/useCan';
import { DetailSection } from '../detail/DetailSection';

interface ElsewhereArea {
  /** The pictures, as an editor would name them. */
  what: string;
  /** Where they appear on the site. */
  where: string;
  /** The console page that edits them, and its name in the sidebar. */
  to: string;
  label: string;
  /** The permission that page needs, so a link never leads to a refusal. */
  resource: AdminResource;
}

/**
 * Every other picture on the site belongs to a record — a programme, a
 * person, an article — and is changed where that record is. Listed here so
 * "where do I change the photo of…?" has one place to start.
 */
export const ELSEWHERE_AREAS: readonly ElsewhereArea[] = [
  {
    what: 'Programme photographs',
    where: 'Home hero slides 2 to 5, the programme cards, Our Work and each programme page',
    to: '/content/pillar-images',
    label: 'Pillar Images',
    resource: 'pillar-images',
  },
  {
    what: 'Page hero images',
    where: 'A published one is shown instead of that page’s banner here',
    to: '/content/page-settings',
    label: 'Page Settings',
    resource: 'page-settings',
  },
  {
    what: 'Team portraits',
    where: 'About, team profiles and the team dialog',
    to: '/content/team',
    label: 'Team',
    resource: 'team',
  },
  {
    what: 'Partner logos',
    where: 'The partner strip on About',
    to: '/content/partners',
    label: 'Partners',
    resource: 'partners',
  },
  {
    what: 'Testimonial photographs',
    where: 'Stories of Impact on the home page',
    to: '/content/stories',
    label: 'Testimonials',
    resource: 'stories',
  },
  {
    what: 'Article covers',
    where: 'News cards and the top of each article',
    to: '/content/articles',
    label: 'News & Blog',
    resource: 'articles',
  },
  {
    what: 'Programme snapshot photographs',
    where: 'The Impact page’s programme gallery',
    to: '/content/gallery',
    label: 'Programme Gallery',
    resource: 'gallery',
  },
  {
    what: 'Event images and flyers',
    where: 'Event cards, the calendar and each event page',
    to: '/events',
    label: 'Events',
    resource: 'events',
  },
  {
    what: 'Impact story photographs',
    where: 'Each impact story, its cover and its gallery',
    to: '/impact-stories',
    label: 'Impact stories',
    resource: 'impact-stories',
  },
  {
    what: 'Application form images',
    where: 'The cover and steps of each application form',
    to: '/forms',
    label: 'Forms',
    resource: 'forms',
  },
  {
    what: 'Popup pictures',
    where: 'The welcome popup, over its drawn illustration',
    to: '/content/popups',
    label: 'Popups',
    resource: 'popups',
  },
];

/** The places other pictures are edited, limited to the pages this person may open. */
export const ElsewhereImages = (): JSX.Element => {
  const can = useCan();
  const areas = ELSEWHERE_AREAS.filter((area) => can('read', area.resource));
  return (
    <DetailSection
      title="Pictures edited elsewhere"
      icon={<CollectionsOutlinedIcon />}
      description="Pictures that belong to a record are changed with that record."
    >
      <Box
        component="ul"
        sx={{
          m: 0,
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          columnGap: 3,
          rowGap: 1.75,
        }}
      >
        {areas.map((area) => (
          <Box component="li" key={area.to}>
            <Typography variant="body2" sx={{ fontWeight: 650 }}>
              {area.what} are edited under{' '}
              <Link
                component={RouterLink}
                to={area.to}
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
              >
                {area.label}
                <ArrowForwardRoundedIcon sx={{ fontSize: 15 }} />
              </Link>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {area.where}.
            </Typography>
          </Box>
        ))}
        <Box component="li">
          <Typography variant="body2" sx={{ fontWeight: 650 }}>
            The logo, browser icon and background patterns stay with the developers
          </Typography>
          <Typography variant="caption" color="text.secondary">
            They are brand assets drawn to exact sizes and recoloured by the site, so a change goes
            through a release.
          </Typography>
        </Box>
      </Box>
    </DetailSection>
  );
};
