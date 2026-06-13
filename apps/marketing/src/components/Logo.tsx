import { ORG } from '@iaa/shared';
import Box from '@mui/material/Box';

export type LogoVariant = 'primary' | 'white';

interface LogoProps {
  variant?: LogoVariant;
  height?: number;
}

const FILES: Record<LogoVariant, string> = {
  primary: 'logo-primary',
  white: 'logo-white',
};

/** Responsive brand logo using the optimised WebP/PNG assets in /public/brand. */
export const Logo = ({ variant = 'primary', height = 44 }: LogoProps): JSX.Element => {
  const file = FILES[variant];
  return (
    <Box component="picture" sx={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}>
      <source srcSet={`/brand/${file}.webp`} type="image/webp" />
      <Box
        component="img"
        src={`/brand/${file}.png`}
        alt={`${ORG.name} logo`}
        sx={{ height, width: 'auto', display: 'block' }}
      />
    </Box>
  );
};
