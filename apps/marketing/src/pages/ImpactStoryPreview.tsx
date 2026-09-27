import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Seo } from '../components/Seo';
import { useImpactStoryPreview } from '../features/impact-stories/api';
import { StoryArticle } from '../features/impact-stories/StoryArticle';
import { ApiError } from '../lib/api-client';

import { StorySkeleton, StoryUnavailable } from './ImpactStory';

// Per tab, so a reload keeps the preview open without the token in the address.
const STORAGE_KEY = 'iaa:marketing:story-preview';

const storedToken = (): string => {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};

const storeToken = (token: string): void => {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Without storage a reload simply needs the link again.
  }
};

/**
 * Says, on every screen size, that this is not the public page. It sits at
 * the top of the content rather than sticking, because the site header
 * already sticks there and the two would overlap.
 */
const PreviewRibbon = (): JSX.Element => (
  <Box
    role="note"
    sx={{
      bgcolor: 'secondary.main',
      color: 'common.black',
      py: 1.25,
    }}
  >
    <Container sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <VisibilityRoundedIcon fontSize="small" aria-hidden />
      <Typography variant="body2" sx={{ fontWeight: 700, color: 'inherit' }}>
        Preview. This is how the story will look once published. Only people with this link can see
        it, and the link stops working two hours after it was made.
      </Typography>
    </Container>
  </Box>
);

/**
 * Staff preview of a story before it is public (`/impact/stories/preview#<token>`).
 *
 * The token arrives after `#`, which browsers never send to a server. It is
 * moved into this tab's storage and taken out of the address straight away,
 * so it is not copied along with the address or shown on a shared screen.
 */
const ImpactStoryPreview = (): JSX.Element => {
  const { hash, pathname, search } = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => hash.replace(/^#/, '') || storedToken());
  const preview = useImpactStoryPreview(token);

  useEffect(() => {
    if (!hash) return;
    storeToken(hash.replace(/^#/, ''));
    void navigate({ pathname, search }, { replace: true });
  }, [hash, navigate, pathname, search]);

  if (!token) {
    return (
      <StoryUnavailable
        title="Story preview"
        message="Previews open from the admin console. Choose Preview on the website on a story to see it here."
        action={false}
      />
    );
  }
  if (preview.isPending) return <StorySkeleton />;
  // Only the API's own "not found" means the link is spent. A sleeping or
  // unreachable API is not the reader's fault, and the link may still work.
  if (preview.isError && !(preview.error instanceof ApiError && preview.error.status === 404)) {
    return (
      <>
        <StoryUnavailable
          title="This preview could not be loaded"
          message="The website could not reach the server just now. Your link may still work: try again in a moment."
          action={false}
        />
        <Box sx={{ textAlign: 'center', mt: -10, pb: 12 }}>
          <Button variant="outlined" onClick={() => void preview.refetch()}>
            Try again
          </Button>
        </Box>
      </>
    );
  }
  if (!preview.data) {
    return (
      <StoryUnavailable
        title="This preview link has expired"
        message="Preview links work for two hours and only for the story they were made for. Open the story in the admin console and choose Preview on the website again."
        action={false}
      />
    );
  }
  return (
    <>
      <Seo title={`Preview: ${preview.data.title}`} noindex />
      <PreviewRibbon />
      <StoryArticle story={preview.data} preview />
    </>
  );
};

export default ImpactStoryPreview;
