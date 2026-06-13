import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const inlineMarkdown = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (!(node instanceof HTMLElement)) {
    return '';
  }

  const content = Array.from(node.childNodes).map(inlineMarkdown).join('');
  switch (node.tagName.toLowerCase()) {
    case 'strong':
    case 'b':
      return `**${content}**`;
    case 'em':
    case 'i':
      return `_${content}_`;
    case 'a': {
      const href = node.getAttribute('href');
      return href ? `[${content}](${href})` : content;
    }
    case 'code':
      return `\`${content}\``;
    case 'br':
      return '\n';
    default:
      return content;
  }
};

const listMarkdown = (element: Element, ordered: boolean): string =>
  Array.from(element.children)
    .filter((child) => child.tagName.toLowerCase() === 'li')
    .map((child, index) => `${ordered ? `${index + 1}.` : '-'} ${inlineMarkdown(child)}`)
    .join('\n');

const blockMarkdown = (element: Element): string => {
  const tag = element.tagName.toLowerCase();
  const content = inlineMarkdown(element).trim();

  switch (tag) {
    case 'h1':
      return `# ${content}`;
    case 'h2':
      return `## ${content}`;
    case 'h3':
      return `### ${content}`;
    case 'h4':
      return `#### ${content}`;
    case 'blockquote':
      return content
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
    case 'ul':
      return listMarkdown(element, false);
    case 'ol':
      return listMarkdown(element, true);
    case 'hr':
      return '---';
    case 'pre':
      return `\`\`\`\n${element.textContent ?? ''}\n\`\`\``;
    case 'img': {
      const src = element.getAttribute('src');
      const alt = element.getAttribute('alt') ?? '';
      return src ? `![${alt}](${src})` : '';
    }
    default:
      return content;
  }
};

/** Converts legacy CMS HTML into Markdown without allowing raw HTML into the page. */
export const normalizeArticleBody = (body: string): string => {
  if (!/<[a-z][\s\S]*>/i.test(body) || typeof DOMParser === 'undefined') {
    return body;
  }

  const document = new DOMParser().parseFromString(body, 'text/html');
  return Array.from(document.body.children).map(blockMarkdown).filter(Boolean).join('\n\n');
};

const List = ({ ordered, children }: { ordered?: boolean; children: ReactNode }): JSX.Element => (
  <Box
    component={ordered ? 'ol' : 'ul'}
    sx={{
      my: 2.25,
      pl: 3.5,
      color: 'text.primary',
      '& li': { mb: 1 },
      '& li::marker': { color: 'primary.main', fontWeight: 700 },
    }}
  >
    {children}
  </Box>
);

const components: Components = {
  h1: ({ children }) => (
    <Typography
      component="h2"
      variant="h3"
      sx={{ mt: 5, mb: 2, fontSize: { xs: '1.75rem', md: '2rem' } }}
    >
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography
      component="h2"
      variant="h4"
      sx={{ mt: 5, mb: 2, fontSize: { xs: '1.5rem', md: '1.8rem' } }}
    >
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography component="h3" variant="h5" sx={{ mt: 4, mb: 1.5 }}>
      {children}
    </Typography>
  ),
  h4: ({ children }) => (
    <Typography component="h4" variant="h6" sx={{ mt: 3.5, mb: 1.25 }}>
      {children}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography
      component="p"
      sx={{
        my: 2,
        color: 'text.primary',
        fontSize: { xs: '1rem', md: '1.08rem' },
        lineHeight: 1.9,
      }}
    >
      {children}
    </Typography>
  ),
  a: ({ href, children }) => (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      sx={{ color: 'primary.main', fontWeight: 650, textUnderlineOffset: 3 }}
    >
      {children}
    </Link>
  ),
  ul: ({ children }) => <List>{children}</List>,
  ol: ({ children }) => <List ordered>{children}</List>,
  li: ({ children }) => (
    <Box component="li" sx={{ pl: 0.5, fontSize: { xs: '1rem', md: '1.06rem' }, lineHeight: 1.8 }}>
      {children}
    </Box>
  ),
  blockquote: ({ children }) => (
    <Box
      component="blockquote"
      sx={{
        position: 'relative',
        my: 4,
        mx: 0,
        px: { xs: 3, md: 4 },
        py: 2.5,
        borderLeft: 4,
        borderColor: 'secondary.main',
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.055),
        color: 'primary.dark',
        '& p': {
          m: 0,
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: { xs: '1.2rem', md: '1.38rem' },
          fontStyle: 'italic',
          lineHeight: 1.65,
        },
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
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '0.88em',
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
        overflowX: 'auto',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: '#F2F4F1',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '0.88rem',
        lineHeight: 1.7,
        '& code': { p: 0, bgcolor: 'transparent' },
      }}
    >
      {children}
    </Box>
  ),
  hr: () => <Divider sx={{ my: 5 }} />,
  img: ({ src, alt }) => (
    <Box
      component="img"
      src={typeof src === 'string' ? src : undefined}
      alt={alt ?? ''}
      loading="lazy"
      sx={{ display: 'block', width: '100%', my: 4, borderRadius: 3 }}
    />
  ),
  table: ({ children }) => (
    <Box sx={{ my: 3, overflowX: 'auto' }}>
      <Box
        component="table"
        sx={{
          width: '100%',
          borderCollapse: 'collapse',
          '& th, & td': {
            border: 1,
            borderColor: 'divider',
            px: 2,
            py: 1.25,
            textAlign: 'left',
          },
          '& th': { bgcolor: 'rgba(26,92,56,0.06)', fontWeight: 700 },
        }}
      >
        {children}
      </Box>
    </Box>
  ),
};

export const ArticleBody = ({ body }: { body: string }): JSX.Element => (
  <Box
    sx={{
      '& > p:first-of-type::first-letter': {
        float: 'left',
        mr: 1,
        mt: 0.65,
        color: 'primary.main',
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '3.8rem',
        fontWeight: 700,
        lineHeight: 0.75,
      },
    }}
  >
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {normalizeArticleBody(body)}
    </ReactMarkdown>
  </Box>
);
