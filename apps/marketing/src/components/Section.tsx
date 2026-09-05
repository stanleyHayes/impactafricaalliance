import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { Watermark, type WatermarkVariant } from './Watermark';

interface SectionProps {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  bgcolor?: string;
  textAlign?: 'left' | 'center';
  color?: 'light' | 'dark';
  watermark?: WatermarkVariant | false;
  watermarkPosition?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left' | 'center';
}

const VARIANTS: WatermarkVariant[] = ['network', 'africa', 'contours', 'radar'];
const POSITIONS: Array<'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'> = [
  'top-right',
  'bottom-right',
  'top-left',
  'bottom-left',
];

const hashString = (value: string): number =>
  value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

const defaultWatermarkFor = (seed: string): { variant: WatermarkVariant; position: typeof POSITIONS[number] } => ({
  variant: VARIANTS[hashString(seed) % VARIANTS.length] as WatermarkVariant,
  position: POSITIONS[hashString(seed) % POSITIONS.length] as typeof POSITIONS[number],
});

const resolveWatermark = (
  watermark: SectionProps['watermark'],
  watermarkPosition: SectionProps['watermarkPosition'],
  seed: string,
): { variant: WatermarkVariant; position: SectionProps['watermarkPosition']; explicit: boolean } | null => {
  if (watermark === false) return null;
  if (watermark) {
    return {
      variant: watermark,
      position: watermarkPosition ?? 'bottom-right',
      explicit: true,
    };
  }
  const fallback = defaultWatermarkFor(seed);
  return { variant: fallback.variant, position: fallback.position, explicit: false };
};

interface SectionHeaderProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  textAlign: 'left' | 'center';
  color: 'light' | 'dark';
}

const SectionEyebrow = ({ eyebrow, textAlign, isLight }: { eyebrow: string; textAlign: 'left' | 'center'; isLight: boolean }): JSX.Element => (
  <Stack
    direction="row"
    alignItems="center"
    justifyContent={textAlign === 'center' ? 'center' : 'flex-start'}
    spacing={1.25}
  >
    <Box sx={{ width: 34, height: 2, borderRadius: 99, bgcolor: 'secondary.main' }} />
    <Typography
      variant="overline"
      sx={{
        color: isLight ? 'secondary.light' : 'text.primary',
        fontWeight: 750,
        letterSpacing: 1.8,
        fontSize: '0.72rem',
      }}
    >
      {eyebrow}
    </Typography>
    {textAlign === 'center' && (
      <Box sx={{ width: 34, height: 2, borderRadius: 99, bgcolor: 'secondary.main' }} />
    )}
  </Stack>
);

const SectionTitle = ({ title, hasEyebrow, isLight }: { title: string; hasEyebrow: boolean; isLight: boolean }): JSX.Element => (
  <Typography
    variant="h2"
    sx={{
      mt: hasEyebrow ? 1.25 : 0,
      fontSize: { xs: '2rem', md: '2.75rem' },
      color: isLight ? 'common.white' : undefined,
    }}
  >
    {title}
  </Typography>
);

const SectionSubtitle = ({ subtitle, isLight }: { subtitle: string; isLight: boolean }): JSX.Element => (
  <Typography
    sx={{
      mt: 1.75,
      color: isLight ? 'rgba(255,255,255,0.76)' : 'text.secondary',
      fontSize: { xs: '1rem', md: '1.08rem' },
      lineHeight: 1.75,
    }}
  >
    {subtitle}
  </Typography>
);

const SectionHeader = ({ eyebrow, title, subtitle, textAlign, color }: SectionHeaderProps): JSX.Element | null => {
  if (!eyebrow && !title && !subtitle) return null;

  const isLight = color === 'light';

  return (
    <Box
      sx={{
        mb: { xs: 4.5, md: 6.5 },
        textAlign,
        maxWidth: textAlign === 'center' ? 800 : 760,
        mx: textAlign === 'center' ? 'auto' : 0,
      }}
    >
      {eyebrow && <SectionEyebrow eyebrow={eyebrow} textAlign={textAlign} isLight={isLight} />}
      {title && <SectionTitle title={title} hasEyebrow={Boolean(eyebrow)} isLight={isLight} />}
      {subtitle && <SectionSubtitle subtitle={subtitle} isLight={isLight} />}
    </Box>
  );
};

/** Consistent editorial section with optional eyebrow/title/subtitle header and watermark. */
export const Section = ({
  children,
  eyebrow,
  title,
  subtitle,
  bgcolor,
  textAlign = 'left',
  color = 'dark',
  watermark,
  watermarkPosition,
}: SectionProps): JSX.Element => {
  const seed = title ?? eyebrow ?? '';
  const resolved = resolveWatermark(watermark, watermarkPosition, seed);
  const isLight = color === 'light';

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        scrollMarginTop: 110,
        py: { xs: 7, md: 11 },
        bgcolor,
      }}
    >
      {resolved && (
        <Watermark
          variant={resolved.variant}
          position={resolved.position}
          size={{ xs: 220, md: 340 }}
          opacity={resolved.explicit ? 0.12 : 0.08}
          sx={{ color: isLight ? 'common.white' : 'primary.main' }}
        />
      )}
      <Container sx={{ position: 'relative', zIndex: 1 }}>
        <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} textAlign={textAlign} color={color} />
        {children}
      </Container>
    </Box>
  );
};
