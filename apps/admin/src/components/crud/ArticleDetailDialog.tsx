import type { MediaAsset } from '@iaa/shared';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import NewspaperRoundedIcon from '@mui/icons-material/NewspaperRounded';
import TagRoundedIcon from '@mui/icons-material/TagRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { formatUtcDate } from '../../lib/date';
import type { ResourceRow } from '../../resources/types';
import { Markdown } from '../markdown/Markdown';

interface ArticleDetailDialogProps {
  open: boolean;
  row: ResourceRow | null;
  onClose: () => void;
  onEdit?: () => void;
  canEdit: boolean;
}

interface ArticleDetail {
  title: string;
  excerpt: string;
  body: string;
  slug: string;
  status: string;
  tags: string[];
  cover?: MediaAsset;
  publishedAt?: unknown;
  updatedAt?: unknown;
  readingTime: number;
}

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const asTags = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const asMedia = (value: unknown): MediaAsset | undefined => {
  if (!value || typeof value !== 'object' || !('url' in value)) {
    return undefined;
  }
  return value as MediaAsset;
};

const formatDate = (value: unknown): string => {
  if (typeof value !== 'string') {
    return 'Not set';
  }
  return formatUtcDate(value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const estimateReadingTime = (body: string): number => {
  const plainText = body
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*_>`~[\]()!-]/g, ' ')
    .trim();
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 220));
};

const formatTag = (tag: string): string =>
  tag
    .split('-')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const statusColor = (status: string): 'default' | 'success' | 'warning' => {
  if (status === 'published') {
    return 'success';
  }
  if (status === 'draft') {
    return 'warning';
  }
  return 'default';
};

const coverAssetDescription = (cover: MediaAsset | undefined): string => {
  if (!cover) {
    return 'No cover image attached';
  }
  if (cover.width && cover.height) {
    return `${cover.width} × ${cover.height}px`;
  }
  return 'Cover image attached';
};

const toArticleDetail = (row: ResourceRow | null): ArticleDetail => {
  const body = asString(row?.body);
  const title = asString(row?.title);
  return {
    title: title || 'Untitled article',
    excerpt: asString(row?.excerpt),
    body,
    slug: asString(row?.slug),
    status: asString(row?.status) || 'draft',
    tags: asTags(row?.tags),
    cover: asMedia(row?.coverImage),
    publishedAt: row?.publishedAt,
    updatedAt: row?.updatedAt,
    readingTime: estimateReadingTime(body),
  };
};

const DetailItem = ({ label, children }: { label: string; children: ReactNode }): JSX.Element => (
  <Box>
    <Typography
      variant="caption"
      sx={{
        display: 'block',
        color: 'text.secondary',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Typography>
    <Box sx={{ mt: 0.5 }}>{children}</Box>
  </Box>
);

const ArticleHero = ({
  article,
  onClose,
}: {
  article: ArticleDetail;
  onClose: () => void;
}): JSX.Element => (
  <DialogTitle component="div" sx={{ position: 'relative', minHeight: { xs: 330, md: 390 }, p: 0 }}>
    {article.cover ? (
      <Box
        component="img"
        src={article.cover.url}
        alt=""
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
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
            'radial-gradient(circle at 75% 20%, alpha(brandColors.gold, 0.3), transparent 24%), linear-gradient(145deg, brandColors.forest, brandColors.forest)',
        }}
      >
        <NewspaperRoundedIcon sx={{ color: 'rgba(255,255,255,0.16)', fontSize: 112 }} />
      </Box>
    )}
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(10,31,20,0.16) 10%, rgba(10,31,20,0.9) 100%)',
      }}
    />

    <IconButton
      aria-label="Close article details"
      onClick={onClose}
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 2,
        border: '1px solid rgba(255,255,255,0.28)',
        bgcolor: 'rgba(10,31,20,0.38)',
        color: 'common.white',
        backdropFilter: 'blur(8px)',
        '&:hover': { bgcolor: 'rgba(10,31,20,0.58)' },
      }}
    >
      <CloseRoundedIcon />
    </IconButton>

    <Box
      sx={{
        position: 'absolute',
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 1,
        p: { xs: 3, sm: 4, md: 5 },
        color: 'common.white',
      }}
    >
      <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
        <Chip
          size="small"
          label={article.status}
          color={statusColor(article.status)}
          sx={{ fontWeight: 700, textTransform: 'capitalize' }}
        />
        <Chip
          size="small"
          icon={<AccessTimeRoundedIcon />}
          label={`${article.readingTime} min read`}
          sx={{
            border: '1px solid rgba(255,255,255,0.22)',
            bgcolor: 'rgba(255,255,255,0.12)',
            color: 'common.white',
            '& .MuiChip-icon': { color: 'secondary.light' },
          }}
        />
      </Stack>
      <Typography
        id="article-detail-title"
        component="h2"
        variant="h3"
        sx={{
          maxWidth: 920,
          color: 'common.white',
          fontSize: { xs: '1.8rem', sm: '2.25rem', md: '2.8rem' },
          lineHeight: 1.1,
        }}
      >
        {article.title}
      </Typography>
      {article.excerpt && (
        <Typography
          id="article-detail-excerpt"
          sx={{
            maxWidth: 780,
            mt: 1.5,
            color: 'rgba(255,255,255,0.76)',
            fontSize: { xs: '0.94rem', md: '1.05rem' },
            lineHeight: 1.65,
          }}
        >
          {article.excerpt}
        </Typography>
      )}
    </Box>
  </DialogTitle>
);

const ArticleBodyPreview = ({ body }: { body: string }): JSX.Element => (
  <Box sx={{ maxWidth: 780, mx: 'auto', p: { xs: 3, sm: 4, md: 6 } }}>
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 3 }}>
      <Box sx={{ width: 32, height: 2, bgcolor: 'secondary.main' }} />
      <Typography
        variant="overline"
        sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: '0.1em' }}
      >
        Article preview
      </Typography>
    </Stack>

    {body.trim() ? (
      <Markdown>{body}</Markdown>
    ) : (
      <Box
        sx={{
          py: 8,
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          bgcolor: 'background.default',
          textAlign: 'center',
        }}
      >
        <NewspaperRoundedIcon sx={{ color: 'text.disabled', fontSize: 44 }} />
        <Typography sx={{ mt: 1.5, fontWeight: 650 }}>No article body yet</Typography>
        <Typography variant="body2" color="text.secondary">
          Edit this draft to add the story content.
        </Typography>
      </Box>
    )}
  </Box>
);

const ArticleMetadata = ({ article }: { article: ArticleDetail }): JSX.Element => (
  <Box component="aside" sx={{ position: { md: 'sticky' }, top: 0, p: { xs: 3, md: 4 } }}>
    <Typography variant="h6" sx={{ fontWeight: 700 }}>
      Publishing details
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
      A quick view of this record&apos;s newsroom metadata.
    </Typography>

    <Stack spacing={3} sx={{ mt: 4 }}>
      <DetailItem label="Status">
        <Chip
          size="small"
          label={article.status}
          color={statusColor(article.status)}
          sx={{ fontWeight: 650, textTransform: 'capitalize' }}
        />
      </DetailItem>
      <DetailItem label="Published">
        <Stack direction="row" spacing={1} alignItems="center">
          <CalendarMonthRoundedIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatDate(article.publishedAt)}
          </Typography>
        </Stack>
      </DetailItem>
      <DetailItem label="Last updated">
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {formatDate(article.updatedAt)}
        </Typography>
      </DetailItem>
      <DetailItem label="Reading time">
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          About {article.readingTime} minute{article.readingTime === 1 ? '' : 's'}
        </Typography>
      </DetailItem>
      <DetailItem label="Slug">
        <Box
          component="code"
          sx={{
            display: 'block',
            maxWidth: '100%',
            overflow: 'hidden',
            px: 1.25,
            py: 1,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1.5,
            bgcolor: 'common.white',
            color: 'text.secondary',
            fontSize: '0.78rem',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          /news/{article.slug || 'untitled'}
        </Box>
      </DetailItem>
    </Stack>

    <Divider sx={{ my: 4 }} />

    <Stack direction="row" spacing={1} alignItems="center">
      <TagRoundedIcon sx={{ color: 'text.secondary', fontSize: 19 }} />
      <Typography sx={{ fontSize: '0.84rem', fontWeight: 700 }}>Topics</Typography>
    </Stack>
    {article.tags.length > 0 ? (
      <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.75} sx={{ mt: 1.5 }}>
        {article.tags.map((tag) => (
          <Chip
            key={tag}
            size="small"
            variant="outlined"
            label={formatTag(tag)}
            sx={{ bgcolor: 'common.white' }}
          />
        ))}
      </Stack>
    ) : (
      <Typography variant="body2" color="text.disabled" sx={{ mt: 1.5 }}>
        No topics assigned
      </Typography>
    )}

    <Divider sx={{ my: 4 }} />

    <Stack direction="row" spacing={1} alignItems="center">
      <ImageOutlinedIcon sx={{ color: 'text.secondary', fontSize: 19 }} />
      <Typography sx={{ fontSize: '0.84rem', fontWeight: 700 }}>Cover asset</Typography>
    </Stack>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
      {coverAssetDescription(article.cover)}
    </Typography>
  </Box>
);

/** Editorial, read-only preview for article records in the admin newsroom. */
export const ArticleDetailDialog = ({
  open,
  row,
  onClose,
  onEdit,
  canEdit,
}: ArticleDetailDialogProps): JSX.Element => {
  const article = toArticleDetail(row);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="article-detail-title"
      aria-describedby={article.excerpt ? 'article-detail-excerpt' : undefined}
      slotProps={{
        paper: {
          sx: {
            width: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 48px)' },
            height: { xs: 'calc(100% - 16px)', sm: 'min(92vh, 940px)' },
            maxHeight: 'none',
            m: { xs: 1, sm: 3 },
            overflow: 'hidden',
            borderRadius: { xs: 2, sm: 4 },
          },
        },
      }}
    >
      <ArticleHero article={article} onClose={onClose} />

      <DialogContent sx={{ flex: 1, overflowY: 'auto', p: 0 }}>
        <Grid container sx={{ minHeight: '100%' }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <ArticleBodyPreview body={article.body} />
          </Grid>
          <Grid
            size={{ xs: 12, md: 4 }}
            sx={{
              borderTop: { xs: 1, md: 0 },
              borderLeft: { md: 1 },
              borderColor: 'divider',
              bgcolor: '#F7F9F7',
            }}
          >
            <ArticleMetadata article={article} />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose}>Close</Button>
        {canEdit && onEdit && (
          <Button variant="contained" startIcon={<EditRoundedIcon />} onClick={onEdit}>
            Edit article
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
