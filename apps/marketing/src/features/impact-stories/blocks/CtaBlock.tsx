import EastIcon from '@mui/icons-material/East';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { MintSurface } from '../../../components/MintSurface';
import { storyLinkTarget } from '../story-utils';

import { BlockFrame, type StoryBlockProps } from './frame';

/**
 * A closing prompt: donate, volunteer, read more. A page on this site opens
 * in place; another site opens in a new tab and learns nothing about this
 * page. A link that fails the safety check shows no button at all.
 */
export const CtaBlock = ({ data }: StoryBlockProps<'cta'>): JSX.Element => {
  const target = storyLinkTarget(data.url);
  return (
    <BlockFrame width="wide">
      <MintSurface sx={{ p: { xs: 3.5, md: 6 }, borderRadius: 4, textAlign: { md: 'center' } }}>
        <Typography component="h2" variant="h3" sx={{ fontSize: { xs: '1.7rem', md: '2.3rem' } }}>
          {data.heading}
        </Typography>
        {data.body && (
          <Typography sx={{ mt: 2, maxWidth: 640, mx: { md: 'auto' }, lineHeight: 1.75 }}>
            {data.body}
          </Typography>
        )}
        {target?.kind === 'internal' && (
          <Button
            component={RouterLink}
            to={target.to}
            variant="contained"
            color="secondary"
            endIcon={<EastIcon />}
            sx={{ mt: 3.5 }}
          >
            {data.label}
          </Button>
        )}
        {target?.kind === 'external' && (
          <Button
            href={target.href}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            color="secondary"
            endIcon={<EastIcon />}
            sx={{ mt: 3.5 }}
          >
            {data.label}
          </Button>
        )}
      </MintSurface>
    </BlockFrame>
  );
};
