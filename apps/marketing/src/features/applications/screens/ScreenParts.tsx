import type { MediaAsset } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { forwardRef, useEffect, useRef, type ReactNode, type RefObject } from 'react';

import { cloudinaryUrl, responsiveSizes, responsiveSrcSet } from '../../../lib/cloudinary-image';
import { SCREEN_HEADING_SX } from '../styles';

/**
 * Pieces every applicant screen is built from, so the cover, the steps, the
 * review and the endings share one rhythm: a narrow reading column, one
 * large heading that takes focus when the screen arrives, and the actions
 * pinned to the bottom of a phone screen.
 */

/** The reading column. Narrow on purpose: one question group at a time. */
export const ScreenColumn = ({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}): JSX.Element => (
  <Container
    maxWidth={wide ? 'lg' : 'sm'}
    sx={{ flex: 1, px: { xs: 2, sm: 3 }, pt: { xs: 4, md: 7 }, pb: { xs: 4, md: 6 } }}
  >
    {children}
  </Container>
);

/**
 * Put focus on an element when it first appears. Used for each screen's
 * heading, so a screen reader starts reading the new screen from the top and
 * a keyboard user continues from there; `preventScroll` because the flow
 * scrolls to the top itself.
 */
export const useFocusOnMount = <T extends HTMLElement>(enabled: boolean): RefObject<T | null> => {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (enabled) {
      ref.current?.focus({ preventScroll: true });
    }
    // Only on arrival; later renders must not pull focus back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
};

interface ScreenHeadingProps {
  id?: string;
  children: ReactNode;
}

/** The screen's one `h1`, focusable so focus can be moved to it. */
export const ScreenHeading = forwardRef<HTMLHeadingElement, ScreenHeadingProps>(
  function ScreenHeading({ id, children }, ref) {
    return (
      <Typography
        ref={ref}
        id={id}
        variant="h2"
        component="h1"
        tabIndex={-1}
        sx={SCREEN_HEADING_SX}
      >
        {children}
      </Typography>
    );
  },
);

/** An image from the form, sized for the screen it sits on. */
export const FormImage = ({
  image,
  aspectRatio,
  sizes,
  eager = false,
}: {
  image: MediaAsset;
  /** A CSS ratio, or one per breakpoint (a tall cover photo would push a phone's text off screen). */
  aspectRatio: string | { xs: string; md?: string };
  sizes: string;
  eager?: boolean;
}): JSX.Element => (
  <Box
    component="img"
    src={cloudinaryUrl(image.url, { width: 1080 })}
    srcSet={responsiveSrcSet(image.url)}
    sizes={sizes}
    alt={image.alt ?? ''}
    loading={eager ? 'eager' : 'lazy'}
    width={image.width}
    height={image.height}
    sx={{
      display: 'block',
      width: '100%',
      height: 'auto',
      aspectRatio,
      objectFit: 'cover',
      borderRadius: 4,
      bgcolor: 'action.hover',
    }}
  />
);

export const STEP_IMAGE_SIZES = responsiveSizes({ xs: '100vw', sm: '600px' });

interface ScreenFooterProps {
  backLabel?: string;
  onBack?: () => void;
  /** Keep Back in place but unusable, as while a file is uploading. */
  backDisabled?: boolean;
  primary: ReactNode;
}

/**
 * Back and the main action. Pinned to the bottom of the screen on phones and
 * small tablets, so the way forward is always in reach however long the step.
 */
export const ScreenFooter = ({
  backLabel = 'Back',
  onBack,
  backDisabled = false,
  primary,
}: ScreenFooterProps): JSX.Element => (
  <Box
    sx={{
      position: { xs: 'sticky', md: 'static' },
      bottom: 0,
      zIndex: 2,
      borderTop: { xs: 1, md: 0 },
      borderColor: 'divider',
      bgcolor: 'background.default',
      pb: 'env(safe-area-inset-bottom)',
    }}
  >
    <Container
      maxWidth="sm"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        px: { xs: 2, sm: 3 },
        py: { xs: 1.5, md: 3 },
      }}
    >
      {onBack ? (
        <Button
          type="button"
          onClick={onBack}
          disabled={backDisabled}
          startIcon={<ArrowBackRoundedIcon />}
          sx={{ color: 'text.primary', px: { xs: 1.5, sm: 2.5 } }}
        >
          {backLabel}
        </Button>
      ) : (
        <span />
      )}
      {primary}
    </Container>
  </Box>
);

interface PrimaryButtonProps {
  children: ReactNode;
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
  arrow?: boolean;
}

/** The large main action of a screen. */
export const PrimaryButton = ({
  children,
  type = 'button',
  onClick,
  disabled = false,
  arrow = true,
}: PrimaryButtonProps): JSX.Element => (
  <Button
    type={type}
    variant="contained"
    size="large"
    onClick={onClick}
    disabled={disabled}
    endIcon={arrow ? <ArrowForwardRoundedIcon /> : undefined}
    // On the narrowest phones the arrow gives way to the words, and long
    // labels may wrap, so the footer never runs off the side of the screen.
    sx={{
      minHeight: 52,
      minWidth: 0,
      px: { xs: 2.5, sm: 4 },
      fontSize: '1.0625rem',
      lineHeight: 1.3,
      whiteSpace: { xs: 'normal', sm: 'nowrap' },
      '& .MuiButton-endIcon': { display: { xs: 'none', sm: 'inherit' } },
    }}
  >
    {children}
  </Button>
);
