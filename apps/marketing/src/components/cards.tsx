import { brandFonts, type Article, type PillarDefinition } from '@iaa/shared';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import EastIcon from '@mui/icons-material/East';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import NewspaperRoundedIcon from '@mui/icons-material/NewspaperRounded';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { programIcon } from '../content/icons';
import { programImage } from '../content/images';
import {
  estimateReadingTime,
  formatArticleDate,
  formatArticleTag,
  getArticleDate,
} from '../lib/article-utils';

export const PillarCard = ({ pillar }: { pillar: PillarDefinition }): JSX.Element => {
  const Icon = programIcon(pillar.key);
  return (
    <Card
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        transition: 'transform .25s, box-shadow .25s',
        '&:hover': { transform: 'translateY(-6px)', boxShadow: 6 },
        '&:hover .pillar-img': { transform: 'scale(1.06)' },
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={pillar.path}
        sx={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        <Box sx={{ position: 'relative', height: 168, flexShrink: 0, overflow: 'hidden' }}>
          <Box
            className="pillar-img"
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${programImage(pillar.key)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transition: 'transform .4s ease',
            }}
          />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            top: 144,
            left: 20,
            width: 50,
            height: 50,
            borderRadius: 2,
            bgcolor: 'secondary.main',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 12px 24px -8px rgba(245,184,0,0.45)',
            zIndex: 1,
          }}
        >
          <Icon sx={{ color: 'common.black', fontSize: 26 }} />
        </Box>
        <CardContent
          sx={{
            pt: 4,
            px: 3,
            pb: 3,
            width: '100%',
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="h6" sx={{ fontFamily: brandFonts.heading }}>{pillar.title}</Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', flexGrow: 1 }}>
            {pillar.description}
          </Typography>
          <Box
            sx={{
              mt: 2,
              color: 'text.primary',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            Learn More <EastIcon fontSize="small" />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

interface StoryCardProps {
  name: string;
  country: string;
  program: string;
  quote: string;
  photoUrl?: string;
}

export const StoryCard = ({
  name,
  country,
  program,
  quote,
  photoUrl,
}: StoryCardProps): JSX.Element => (
  <Card
    sx={{
      position: 'relative',
      height: '100%',
      borderRadius: 3,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'transform 240ms ease, border-color 240ms ease, box-shadow 240ms ease',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 22px 48px -34px rgba(0,0,0,0.18)' },
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: (theme) => `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
      },
    }}
  >
    <CardContent sx={{ p: 3.5, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <FormatQuoteRoundedIcon
        sx={{ fontSize: 44, color: 'secondary.light', opacity: 0.35, transform: 'scaleX(-1)', mb: -1 }}
      />
      <Typography
        sx={{
          fontFamily: brandFonts.heading,
          fontStyle: 'italic',
          fontSize: '1.12rem',
          lineHeight: 1.7,
          color: 'text.primary',
          flexGrow: 1,
        }}
      >
        {quote}
      </Typography>
      <Divider sx={{ my: 2.5 }} />
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar
          src={photoUrl}
          sx={{ width: 52, height: 52, bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}
        >
          {name.charAt(0)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>{name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {country} · {program}
          </Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const clampSx = (lines: number) => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical' as const,
  overflow: 'hidden',
});

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
}

const ARTICLE_CARD_STYLES = {
  featured: {
    gridTemplateColumns: { xs: '1fr', md: '1.12fr 0.88fr' },
    imageMinHeight: { xs: 280, md: 440 },
    placeholderIconSize: 88,
    chipInset: 20,
    kicker: 'Featured story',
    contentPadding: { xs: 3.5, md: 5 },
    metadataMarginBottom: 3,
    titleVariant: 'h4',
    titleFontSize: { xs: '1.65rem', md: '2.05rem' },
    titleLineHeight: 1.22,
    titleLines: 3,
    excerptVariant: 'body1',
    excerptLineHeight: 1.75,
    excerptLines: 4,
    actionMarginTop: 4,
  },
  standard: {
    gridTemplateColumns: '1fr',
    imageMinHeight: 230,
    placeholderIconSize: 64,
    chipInset: 16,
    kicker: undefined,
    contentPadding: 3,
    metadataMarginBottom: 2,
    titleVariant: 'h6',
    titleFontSize: undefined,
    titleLineHeight: 1.35,
    titleLines: 2,
    excerptVariant: 'body2',
    excerptLineHeight: 1.65,
    excerptLines: 3,
    actionMarginTop: 3,
  },
} as const;

type ArticleCardStyle =
  | (typeof ARTICLE_CARD_STYLES)['featured']
  | (typeof ARTICLE_CARD_STYLES)['standard'];

const ArticleArtwork = ({
  article,
  category,
  styles,
}: {
  article: Article;
  category: string;
  styles: ArticleCardStyle;
}): JSX.Element => (
  <Box
    sx={{
      position: 'relative',
      minHeight: styles.imageMinHeight,
      overflow: 'hidden',
      bgcolor: 'primary.dark',
    }}
  >
    {article.coverImage ? (
      <Box
        component="img"
        className="article-img"
        src={article.coverImage.url}
        alt={article.coverImage.alt ?? ''}
        loading="lazy"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transition: 'transform 500ms ease',
        }}
      />
    ) : (
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          background:
            'radial-gradient(circle at 25% 25%, rgba(245,184,0,0.25), transparent 24%), linear-gradient(145deg, #001E14, #0B3D2E)',
        }}
      >
        <NewspaperRoundedIcon
          sx={{ fontSize: styles.placeholderIconSize, color: 'rgba(255,255,255,0.2)' }}
        />
      </Box>
    )}
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(10,35,22,0.06) 35%, rgba(10,35,22,0.68) 100%)',
      }}
    />
    <Chip
      size="small"
      label={category}
      sx={{
        position: 'absolute',
        top: styles.chipInset,
        left: styles.chipInset,
        border: '1px solid rgba(255,255,255,0.38)',
        bgcolor: 'rgba(255,255,255,0.92)',
        color: 'text.primary',
        fontSize: '0.74rem',
        fontWeight: 700,
        letterSpacing: 0.35,
        backdropFilter: 'blur(8px)',
      }}
    />
    {styles.kicker && (
      <Typography
        variant="overline"
        sx={{
          position: 'absolute',
          bottom: 20,
          left: 22,
          color: 'common.white',
          fontWeight: 700,
          letterSpacing: 1.7,
        }}
      >
        {styles.kicker}
      </Typography>
    )}
  </Box>
);

const ArticleMetadata = ({
  date,
  readingTime,
  marginBottom,
}: {
  date: string;
  readingTime: number;
  marginBottom: number;
}): JSX.Element => (
  <Stack
    direction="row"
    spacing={2}
    alignItems="center"
    sx={{ mb: marginBottom, color: 'text.secondary' }}
  >
    <Stack direction="row" spacing={0.7} alignItems="center">
      <CalendarMonthRoundedIcon sx={{ color: 'text.secondary', fontSize: 17 }} />
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {formatArticleDate(date)}
      </Typography>
    </Stack>
    <Stack direction="row" spacing={0.7} alignItems="center">
      <AccessTimeRoundedIcon sx={{ color: 'text.secondary', fontSize: 17 }} />
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {readingTime} min read
      </Typography>
    </Stack>
  </Stack>
);

const ArticleCardContent = ({
  article,
  date,
  readingTime,
  styles,
}: {
  article: Article;
  date: string;
  readingTime: number;
  styles: ArticleCardStyle;
}): JSX.Element => (
  <CardContent
    sx={{
      display: 'flex',
      width: '100%',
      flexDirection: 'column',
      p: styles.contentPadding,
    }}
  >
    <ArticleMetadata
      date={date}
      readingTime={readingTime}
      marginBottom={styles.metadataMarginBottom}
    />

    <Typography
      component="h3"
      variant={styles.titleVariant}
      sx={{
        color: 'text.primary',
        fontSize: styles.titleFontSize,
        lineHeight: styles.titleLineHeight,
        ...clampSx(styles.titleLines),
      }}
    >
      {article.title}
    </Typography>

    <Typography
      variant={styles.excerptVariant}
      color="text.secondary"
      sx={{
        mt: 1.75,
        flexGrow: 1,
        lineHeight: styles.excerptLineHeight,
        ...clampSx(styles.excerptLines),
      }}
    >
      {article.excerpt}
    </Typography>

    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mt: styles.actionMarginTop, pt: 2.5, borderTop: 1, borderColor: 'divider' }}
    >
      <Typography sx={{ color: 'text.primary', fontSize: '0.85rem', fontWeight: 750 }}>
        Read story
      </Typography>
      <Box
        className="article-arrow"
        sx={{
          display: 'grid',
          width: 38,
          height: 38,
          placeItems: 'center',
          border: 1,
          borderColor: 'divider',
          borderRadius: '50%',
          color: 'text.primary',
          transition: 'background-color 200ms ease, color 200ms ease, transform 200ms ease',
        }}
      >
        <EastIcon fontSize="small" />
      </Box>
    </Stack>
  </CardContent>
);

export const ArticleCard = ({ article, featured = false }: ArticleCardProps): JSX.Element => {
  const date = getArticleDate(article);
  const category = formatArticleTag(article.tags[0] ?? 'News');
  const readingTime = estimateReadingTime(article.body);
  const styles = ARTICLE_CARD_STYLES[featured ? 'featured' : 'standard'];

  return (
    <Card
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: 'transform 240ms ease, border-color 240ms ease, box-shadow 240ms ease',
        '&:hover': {
          borderColor: (theme) => (theme.palette.mode === 'light' ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.22)'),
          boxShadow: '0 22px 48px -34px rgba(0,0,0,0.18)',
          transform: 'translateY(-5px)',
        },
        '&:hover .article-img': { transform: 'scale(1.045)' },
        '&:hover .article-arrow': {
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          transform: 'translateX(3px)',
        },
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={`/news/${article.slug}`}
        aria-label={`Read ${article.title}`}
        sx={{
          display: 'grid',
          width: '100%',
          height: '100%',
          gridTemplateColumns: styles.gridTemplateColumns,
          alignItems: 'stretch',
        }}
      >
        <ArticleArtwork article={article} category={category} styles={styles} />
        <ArticleCardContent
          article={article}
          date={date}
          readingTime={readingTime}
          styles={styles}
        />
      </CardActionArea>
    </Card>
  );
};
