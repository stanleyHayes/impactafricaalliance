import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
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

/** Consistent editorial section with optional eyebrow/title/subtitle header. */
export const Section = ({
  children,
  eyebrow,
  title,
  subtitle,
  bgcolor,
  textAlign = 'left',
}: SectionProps): JSX.Element => (
  <Box
    component="section"
    sx={{
      position: 'relative',
      scrollMarginTop: 110,
      py: { xs: 7, md: 11 },
      bgcolor,
    }}
  >
    <Container>
      {(eyebrow ?? title ?? subtitle) && (
        <Box
          sx={{
            mb: { xs: 4.5, md: 6.5 },
            textAlign,
            maxWidth: textAlign === 'center' ? 800 : 760,
            mx: textAlign === 'center' ? 'auto' : 0,
          }}
        >
          {eyebrow && (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent={textAlign === 'center' ? 'center' : 'flex-start'}
              spacing={1.25}
            >
              <Box sx={{ width: 34, height: 2, borderRadius: 99, bgcolor: 'secondary.main' }} />
              <Typography
                variant="overline"
                sx={{ color: 'success.main', fontWeight: 750, letterSpacing: 1.7 }}
              >
                {eyebrow}
              </Typography>
              {textAlign === 'center' && (
                <Box sx={{ width: 34, height: 2, borderRadius: 99, bgcolor: 'secondary.main' }} />
              )}
            </Stack>
          )}
          {title && (
            <Typography
              variant="h2"
              sx={{ mt: eyebrow ? 1.25 : 0, fontSize: { xs: '2rem', md: '2.75rem' } }}
            >
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography
              sx={{
                mt: 1.75,
                color: 'text.secondary',
                fontSize: { xs: '1rem', md: '1.08rem' },
                lineHeight: 1.75,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      )}
      {children}
    </Container>
  </Box>
);
