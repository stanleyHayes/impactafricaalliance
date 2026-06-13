import type { Article } from '@iaa/shared';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import XIcon from '@mui/icons-material/X';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { ArticleBody } from '../components/ArticleBody';
import { Seo } from '../components/Seo';
import { IMAGES } from '../content/images';
import {
  estimateReadingTime,
  formatArticleDate,
  formatArticleTag,
  getArticleDate,
} from '../lib/article-utils';
import { useArticle } from '../lib/content-hooks';

const ArticleLoading = (): JSX.Element => (
  <>
    <Box sx={{ bgcolor: 'primary.dark', py: { xs: 8, md: 12 } }}>
      <Container>
        <Skeleton width={120} sx={{ bgcolor: 'rgba(255,255,255,0.16)' }} />
        <Skeleton width="82%" height={82} sx={{ mt: 4, bgcolor: 'rgba(255,255,255,0.16)' }} />
        <Skeleton width="58%" height={36} sx={{ bgcolor: 'rgba(255,255,255,0.12)' }} />
      </Container>
    </Box>
    <Container sx={{ py: 8 }}>
      <Grid container spacing={5}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Skeleton height={24} />
          <Skeleton height={24} />
          <Skeleton height={24} width="88%" />
          <Skeleton height={24} sx={{ mt: 3 }} />
          <Skeleton height={24} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Skeleton variant="rounded" height={280} />
        </Grid>
      </Grid>
    </Container>
  </>
);

const ArticleNotFound = (): JSX.Element => (
  <Container sx={{ py: { xs: 10, md: 16 }, textAlign: 'center' }}>
    <Typography
      variant="overline"
      sx={{ color: 'success.main', fontWeight: 700, letterSpacing: 1.5 }}
    >
      News &amp; Stories
    </Typography>
    <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: '2rem', md: '2.8rem' } }}>
      Article not found
    </Typography>
    <Typography color="text.secondary" sx={{ mt: 2 }}>
      This story may have moved or is no longer available.
    </Typography>
    <Button
      component={RouterLink}
      to="/news"
      variant="contained"
      startIcon={<ArrowBackRoundedIcon />}
      sx={{ mt: 4 }}
    >
      Explore all stories
    </Button>
  </Container>
);

const ArticleHero = ({ article }: { article: Article }): JSX.Element => {
  const category = formatArticleTag(article.tags[0] ?? 'News');
  const date = formatArticleDate(getArticleDate(article));
  const readingTime = estimateReadingTime(article.body);
  const image = article.coverImage?.url ?? IMAGES.community;

  return (
    <Box
      component="header"
      sx={{
        position: 'relative',
        minHeight: { xs: 560, md: 650 },
        overflow: 'hidden',
        color: 'common.white',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${image})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          transform: 'scale(1.015)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(8,31,19,0.94) 0%, rgba(8,31,19,0.8) 54%, rgba(8,31,19,0.42) 100%), linear-gradient(0deg, rgba(8,31,19,0.72), transparent 55%)',
        }}
      />

      <Container
        sx={{
          position: 'relative',
          display: 'flex',
          minHeight: { xs: 560, md: 650 },
          flexDirection: 'column',
          justifyContent: 'space-between',
          py: { xs: 5, md: 7 },
        }}
      >
        <Link
          component={RouterLink}
          to="/news"
          underline="none"
          sx={{
            display: 'inline-flex',
            width: 'fit-content',
            alignItems: 'center',
            gap: 1,
            color: 'rgba(255,255,255,0.78)',
            fontSize: '0.88rem',
            fontWeight: 650,
            '&:hover': { color: 'common.white' },
          }}
        >
          <ArrowBackRoundedIcon fontSize="small" />
          All news &amp; stories
        </Link>

        <Box sx={{ maxWidth: 960, pt: 8 }}>
          <Chip
            size="small"
            label={category}
            sx={{
              mb: 3,
              border: '1px solid rgba(255,255,255,0.35)',
              bgcolor: 'rgba(255,255,255,0.12)',
              color: 'common.white',
              fontWeight: 700,
              backdropFilter: 'blur(8px)',
            }}
          />
          <Typography
            component="h1"
            variant="h1"
            sx={{
              maxWidth: 900,
              color: 'common.white',
              fontSize: { xs: '2.35rem', sm: '3rem', md: '4rem' },
              lineHeight: 1.06,
              letterSpacing: '-0.025em',
            }}
          >
            {article.title}
          </Typography>
          <Typography
            sx={{
              maxWidth: 760,
              mt: 3,
              color: 'rgba(255,255,255,0.8)',
              fontSize: { xs: '1.05rem', md: '1.22rem' },
              lineHeight: 1.7,
            }}
          >
            {article.excerpt}
          </Typography>
          <Stack
            direction="row"
            spacing={2.5}
            alignItems="center"
            sx={{ mt: 4, color: 'rgba(255,255,255,0.72)' }}
          >
            <Stack direction="row" spacing={0.8} alignItems="center">
              <CalendarMonthRoundedIcon sx={{ color: 'secondary.light', fontSize: 19 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {date}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.8} alignItems="center">
              <AccessTimeRoundedIcon sx={{ color: 'secondary.light', fontSize: 19 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {readingTime} min read
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

const ShareLinks = ({ article }: { article: Article }): JSX.Element => {
  const url = typeof window === 'undefined' ? '' : window.location.href;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(article.title);
  const links = [
    {
      label: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      Icon: LinkedInIcon,
    },
    {
      label: 'Share on X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      Icon: XIcon,
    },
    {
      label: 'Share by email',
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
      Icon: EmailRoundedIcon,
    },
  ];

  return (
    <Stack direction="row" spacing={1}>
      {links.map(({ label, href, Icon }) => (
        <IconButton
          key={label}
          component="a"
          href={href}
          target={label === 'Share by email' ? undefined : '_blank'}
          rel={label === 'Share by email' ? undefined : 'noopener noreferrer'}
          aria-label={label}
          sx={{
            border: 1,
            borderColor: 'divider',
            color: 'primary.main',
            '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(26,92,56,0.06)' },
          }}
        >
          <Icon fontSize="small" />
        </IconButton>
      ))}
    </Stack>
  );
};

const ArticleSidebar = ({ article }: { article: Article }): JSX.Element => (
  <Box
    component="aside"
    sx={{
      position: { md: 'sticky' },
      top: { md: 126 },
      p: 3,
      border: 1,
      borderColor: 'divider',
      borderRadius: 3,
      bgcolor: 'rgba(255,255,255,0.72)',
    }}
  >
    <Typography
      variant="overline"
      sx={{ color: 'success.main', fontWeight: 700, letterSpacing: 1.3 }}
    >
      Story details
    </Typography>
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Box>
        <Typography variant="caption" color="text.secondary">
          Published
        </Typography>
        <Typography sx={{ mt: 0.25, fontWeight: 650 }}>
          {formatArticleDate(getArticleDate(article))}
        </Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          Reading time
        </Typography>
        <Typography sx={{ mt: 0.25, fontWeight: 650 }}>
          {estimateReadingTime(article.body)} minutes
        </Typography>
      </Box>
    </Stack>

    {article.tags.length > 0 && (
      <>
        <Divider sx={{ my: 3 }} />
        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1.5 }}>
          <LocalOfferOutlinedIcon sx={{ color: 'primary.main', fontSize: 18 }} />
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>Topics</Typography>
        </Stack>
        <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.8}>
          {article.tags.map((tag) => (
            <Chip
              key={tag}
              size="small"
              label={formatArticleTag(tag)}
              variant="outlined"
              sx={{ bgcolor: 'common.white' }}
            />
          ))}
        </Stack>
      </>
    )}

    <Divider sx={{ my: 3 }} />
    <Typography sx={{ mb: 1.5, fontSize: '0.82rem', fontWeight: 700 }}>Share this story</Typography>
    <ShareLinks article={article} />
  </Box>
);

const ArticleFooter = (): JSX.Element => (
  <Box
    sx={{
      mt: 7,
      p: { xs: 3.5, md: 5 },
      borderRadius: 4,
      bgcolor: 'primary.dark',
      color: 'common.white',
    }}
  >
    <Typography
      variant="overline"
      sx={{ color: 'secondary.light', fontWeight: 700, letterSpacing: 1.5 }}
    >
      Keep exploring
    </Typography>
    <Typography variant="h4" sx={{ mt: 1, maxWidth: 560, color: 'common.white' }}>
      More stories from communities shaping Africa&apos;s future.
    </Typography>
    <Button
      component={RouterLink}
      to="/news"
      variant="contained"
      color="secondary"
      startIcon={<ArrowBackRoundedIcon />}
      sx={{ mt: 3 }}
    >
      Back to all stories
    </Button>
  </Box>
);

const NewsArticle = (): JSX.Element => {
  const { slug = '' } = useParams();
  const { data: article, isLoading, isError } = useArticle(slug);

  if (isLoading) {
    return <ArticleLoading />;
  }

  if (isError || !article) {
    return <ArticleNotFound />;
  }

  return (
    <>
      <Seo title={article.title} description={article.excerpt} />
      <ArticleHero article={article} />

      <Box component="main" sx={{ bgcolor: 'background.default', py: { xs: 6, md: 10 } }}>
        <Container>
          <Grid container spacing={{ xs: 5, md: 7 }} alignItems="flex-start">
            <Grid size={{ xs: 12, md: 8 }}>
              <Box
                component="article"
                sx={{
                  p: { xs: 3, sm: 4.5, md: 6 },
                  border: 1,
                  borderColor: 'rgba(26,92,56,0.1)',
                  borderRadius: 4,
                  bgcolor: 'background.paper',
                }}
              >
                <ArticleBody body={article.body} />
              </Box>
              <ArticleFooter />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <ArticleSidebar article={article} />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </>
  );
};

export default NewsArticle;
