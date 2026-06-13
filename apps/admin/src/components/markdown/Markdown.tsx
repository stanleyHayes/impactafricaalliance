import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** MUI-styled renderers for GitHub-flavoured markdown elements. */
const components: Components = {
  h1: ({ children }) => (
    <Typography variant="h4" sx={{ fontWeight: 700, mt: 3, mb: 1.5 }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="h5" sx={{ fontWeight: 700, mt: 3, mb: 1.25 }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="h6" sx={{ fontWeight: 700, mt: 2.5, mb: 1 }}>
      {children}
    </Typography>
  ),
  h4: ({ children }) => (
    <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 2, mb: 0.75 }}>
      {children}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography variant="body1" sx={{ my: 1.25, lineHeight: 1.7 }}>
      {children}
    </Typography>
  ),
  a: ({ href, children }) => (
    <Link href={href} target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 600 }}>
      {children}
    </Link>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ my: 1.25, pl: 3, '& li': { mb: 0.5 } }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ my: 1.25, pl: 3, '& li': { mb: 0.5 } }}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Box component="li" sx={{ lineHeight: 1.7 }}>
      {children}
    </Box>
  ),
  blockquote: ({ children }) => (
    <Box
      sx={{
        my: 1.5,
        pl: 2,
        py: 0.5,
        borderLeft: (t) => `3px solid ${alpha(t.palette.primary.main, 0.5)}`,
        color: 'text.secondary',
        fontStyle: 'italic',
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
        fontSize: '0.85em',
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
        my: 1.5,
        p: 2,
        borderRadius: 2,
        overflowX: 'auto',
        bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
        border: (t) => `1px solid ${alpha(t.palette.text.primary, 0.08)}`,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '0.85rem',
        '& code': { bgcolor: 'transparent', p: 0 },
      }}
    >
      {children}
    </Box>
  ),
  hr: () => <Divider sx={{ my: 2.5 }} />,
  img: ({ src, alt }) => (
    <Box
      component="img"
      src={typeof src === 'string' ? src : undefined}
      alt={alt ?? ''}
      sx={{ maxWidth: '100%', borderRadius: 2, my: 1.5 }}
    />
  ),
  table: ({ children }) => (
    <Box sx={{ overflowX: 'auto', my: 2 }}>
      <Box
        component="table"
        sx={{
          borderCollapse: 'collapse',
          width: '100%',
          '& th, & td': {
            border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.14)}`,
            px: 1.5,
            py: 1,
            textAlign: 'left',
            fontSize: '0.875rem',
          },
          '& th': { bgcolor: (t) => alpha(t.palette.primary.main, 0.05), fontWeight: 700 },
        }}
      >
        {children}
      </Box>
    </Box>
  ),
};

/** Renders a markdown string as styled MUI content (GFM: tables, strikethrough, task lists). */
export const Markdown = ({ children }: { children: string }): JSX.Element => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
    {children}
  </ReactMarkdown>
);
