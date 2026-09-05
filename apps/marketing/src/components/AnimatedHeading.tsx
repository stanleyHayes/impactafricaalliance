import Box from '@mui/material/Box';
import Typography, { type TypographyProps } from '@mui/material/Typography';
import { m, useReducedMotion } from 'framer-motion';

import { rise, staggerParent, riseChild, staticChild, transitions } from '../theme/motion';

interface AnimatedHeadingProps extends Omit<TypographyProps, 'children'> {
  text: string;
  /** Delay before the first word, for sequencing against a hero's other parts. */
  delay?: number;
  component?: React.ElementType;
}

/**
 * A heading whose words rise into place, one just after the next.
 *
 * This is the site's one deliberately theatrical moment, so it is reserved for
 * page heroes. Using it on every heading would turn a signature into noise.
 *
 * Words animate rather than characters: character-level staggers on a long
 * headline read as a typing gimmick, and they wreck screen-reader output. The
 * whole string is exposed to assistive tech via aria-label, and the animated
 * spans are hidden from it.
 */
export const AnimatedHeading = ({
  text,
  delay = 0,
  sx,
  ...typographyProps
}: AnimatedHeadingProps): JSX.Element => {
  const reduceMotion = useReducedMotion();
  const words = text.split(' ').filter(Boolean);

  return (
    <Typography
      {...typographyProps}
      aria-label={text}
      sx={{ ...sx, display: 'block' }}
    >
      <Box
        component={m.span}
        aria-hidden
        variants={staggerParent(reduceMotion ? 0.02 : 0.055, delay)}
        initial="hidden"
        animate="visible"
        sx={{ display: 'inline' }}
      >
        {words.map((word, index) => (
          <Box
            key={`${word}-${index}`}
            component="span"
            sx={{
              display: 'inline-block',
              // Clips the word's travel so it rises out of the line rather
              // than floating in from empty space.
              overflow: 'hidden',
              verticalAlign: 'bottom',
              pb: '0.08em',
            }}
          >
            <Box
              component={m.span}
              variants={reduceMotion ? staticChild : riseChild(rise.lg)}
              transition={transitions.hero}
              sx={{ display: 'inline-block', willChange: 'transform' }}
            >
              {word}
              {index < words.length - 1 ? ' ' : ''}
            </Box>
          </Box>
        ))}
      </Box>
    </Typography>
  );
};
