import type { MediaAsset } from '@iaa/shared';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Markdown } from './Markdown';

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const EmptyPreview = (): JSX.Element => (
  <Stack alignItems="center" justifyContent="center" sx={{ py: 8, textAlign: 'center' }}>
    <Typography sx={{ fontWeight: 600 }}>Nothing to preview yet</Typography>
    <Typography variant="body2" color="text.secondary">
      Fill in the article fields to see how it will read.
    </Typography>
  </Stack>
);

interface PreviewHeaderProps {
  title: string;
  excerpt: string;
  status: string;
  tags: string[];
  cover?: string;
}

const PreviewHeader = ({
  title,
  excerpt,
  status,
  tags,
  cover,
}: PreviewHeaderProps): JSX.Element => (
  <>
    {cover && (
      <Box
        component="img"
        src={cover}
        alt=""
        sx={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 2, mb: 2.5 }}
      />
    )}

    {status && (
      <Chip
        size="small"
        label={status}
        color={status === 'published' ? 'success' : 'default'}
        sx={{ mb: 1.5, textTransform: 'capitalize' }}
      />
    )}

    <Typography
      variant="h3"
      sx={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.01em', mb: excerpt ? 1.5 : 2 }}
    >
      {title || 'Untitled article'}
    </Typography>

    {excerpt && (
      <Typography
        variant="h6"
        color="text.secondary"
        sx={{ fontWeight: 400, lineHeight: 1.5, mb: 2 }}
      >
        {excerpt}
      </Typography>
    )}

    {tags.length > 0 && (
      <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75, mb: 2 }}>
        {tags.map((tag) => (
          <Chip key={tag} size="small" variant="outlined" label={tag} />
        ))}
      </Stack>
    )}
  </>
);

const PreviewBody = ({ body }: { body: string }): JSX.Element =>
  body.trim() ? (
    <Markdown>{body}</Markdown>
  ) : (
    <Typography color="text.disabled">No body content yet.</Typography>
  );

/** Live "as it will read" preview of the article form values. */
export const ArticlePreview = ({ values }: { values: Record<string, unknown> }): JSX.Element => {
  const title = asString(values.title);
  const excerpt = asString(values.excerpt);
  const body = asString(values.body);
  const status = asString(values.status);
  const tags = Array.isArray(values.tags) ? (values.tags as string[]) : [];
  const cover = (values.coverImage as MediaAsset | undefined)?.url;
  const isEmpty = !title && !excerpt && !body && !cover;

  if (isEmpty) {
    return <EmptyPreview />;
  }

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', py: 1 }}>
      <PreviewHeader title={title} excerpt={excerpt} status={status} tags={tags} cover={cover} />
      <Divider sx={{ mb: 2 }} />
      <PreviewBody body={body} />
    </Box>
  );
};
