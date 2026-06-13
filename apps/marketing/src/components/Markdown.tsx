import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** MUI-styled renderers for GitHub-flavoured markdown (used for article/story bodies). */
const components: Components = {
  h1: ({ children }) => (
    <Typography variant="h3" sx={{ fontWeight: 800, mt: 5, mb: 2 }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="h4" sx={{ fontWeight: 700, mt: 4, mb: 1.5 }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="h5" sx={{ fontWeight: 700, mt: 3.5, mb: 1.25 }}>
      {children}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography sx={{ my: 2, lineHeight: 1.85, fontSize: '1.05rem' }}>{children}</Typography>
  ),
  a: ({ href, children }) => (
    <Link href={href} target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 600 }}>
      {children}
    </Link>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ my: 2, pl: 3.5, '& li': { mb: 1, lineHeight: 1.8 } }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ my: 2, pl: 3.5, '& li': { mb: 1, lineHeight: 1.8 } }}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Box component="li" sx={{ fontSize: '1.05rem' }}>
      {children}
    </Box>
  ),
  blockquote: ({ children }) => (
    <Box
      sx={{
        my: 3,
        pl: 3,
        py: 1,
        borderLeft: (t) => `4px solid ${t.palette.secondary.main}`,
        color: 'text.secondary',
        fontStyle: 'italic',
        fontSize: '1.15rem',
      }}
    >
      {children}
    </Box>
  ),
  code: ({ children }) => (
    <Box
      component="code"
      sx={{
        px: 0.75,
        py: 0.25,
        borderRadius: 1,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '0.9em',
        bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
      }}
    >
      {children}
    </Box>
  ),
  pre: ({ children }) => (
    <Box
      component="pre"
      sx={{
        my: 3,
        p: 2.5,
        borderRadius: 2,
        overflowX: 'auto',
        bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '0.9rem',
        '& code': { bgcolor: 'transparent', p: 0 },
      }}
    >
      {children}
    </Box>
  ),
  hr: () => <Divider sx={{ my: 4 }} />,
  img: ({ src, alt }) => (
    <Box
      component="img"
      src={typeof src === 'string' ? src : undefined}
      alt={alt ?? ''}
      sx={{ maxWidth: '100%', borderRadius: 2, my: 2 }}
    />
  ),
};

/** Renders a markdown string as styled MUI content. */
export const Markdown = ({ children }: { children: string }): JSX.Element => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
    {children}
  </ReactMarkdown>
);
