import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  bgcolor?: string;
  textAlign?: 'left' | 'center';
}

/** Consistent vertical section with optional eyebrow/title/subtitle header. */
export const Section = ({
  children,
  eyebrow,
  title,
  subtitle,
  bgcolor,
  textAlign = 'left',
}: SectionProps): JSX.Element => (
  <Box component="section" sx={{ py: { xs: 6, md: 10 }, bgcolor }}>
    <Container>
      {(eyebrow ?? title ?? subtitle) && (
        <Box
          sx={{
            mb: { xs: 4, md: 6 },
            textAlign,
            maxWidth: textAlign === 'center' ? 760 : 'none',
            mx: textAlign === 'center' ? 'auto' : 0,
          }}
        >
          {eyebrow && (
            <Typography
              variant="overline"
              sx={{ color: 'success.main', fontWeight: 700, letterSpacing: 1.5 }}
            >
              {eyebrow}
            </Typography>
          )}
          {title && (
            <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: '1.9rem', md: '2.5rem' } }}>
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="h6" sx={{ mt: 1.5, fontWeight: 400, color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      )}
      {children}
    </Container>
  </Box>
);
