import { keyframes } from '@emotion/react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

export type WatermarkVariant = 'radar' | 'africa' | 'contours' | 'network';

interface WatermarkProps {
  variant: WatermarkVariant;
  color?: string;
  opacity?: number;
  size?: number | string | Record<string, number | string>;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left' | 'center';
  sx?: SxProps<Theme>;
}

const urls: Record<WatermarkVariant, string> = {
  network: '/patterns/alliance-network.svg',
  radar: '/patterns/radar-rings.svg',
  africa: '/patterns/africa-rings.svg',
  contours: '/patterns/contour-lines.svg',
};

const slowRotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const slowPulse = keyframes`
  0%, 100% { transform: scale(1) translateY(0); }
  50% { transform: scale(1.04) translateY(-10px); }
`;

const slowFloat = keyframes`
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(14px, -8px); }
  50% { transform: translate(-6px, 6px); }
  75% { transform: translate(10px, 4px); }
`;

export const Watermark = ({
  variant,
  color = 'inherit',
  opacity = 0.06,
  size = 280,
  position = 'bottom-right',
  sx,
}: WatermarkProps): JSX.Element => {
  const positionStyles = (): SxProps<Theme> => {
    switch (position) {
      case 'top-left':
        return { top: -40, left: -40 };
      case 'bottom-left':
        return { bottom: -40, left: -40 };
      case 'top-right':
        return { top: -40, right: -40 };
      case 'center':
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      case 'bottom-right':
      default:
        return { bottom: -40, right: -40 };
    }
  };

  const animations: Record<WatermarkVariant, string> = {
    contours: `${slowFloat} 28s ease-in-out infinite`,
    africa: `${slowPulse} 18s ease-in-out infinite`,
    radar: `${slowRotate} 120s linear infinite`,
    network: `${slowRotate} 120s linear infinite`,
  };
  const animation = animations[variant];

  return (
    <Box
      aria-hidden
      sx={() => ({
        position: 'absolute',
        width: size,
        height: variant === 'contours' ? 'auto' : size,
        aspectRatio: variant === 'contours' ? '1440/520' : '1 / 1',
        bgcolor: 'currentColor',
        mask: `url(${urls[variant]}) no-repeat center / contain`,
        WebkitMask: `url(${urls[variant]}) no-repeat center / contain`,
        color,
        opacity,
        pointerEvents: 'none',
        zIndex: 0,
        animation: position === 'center' ? 'none' : animation,
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
        },
        ...positionStyles(),
        ...(Array.isArray(sx) ? sx.reduce((acc, item) => ({ ...acc, ...item }), {}) : sx),
      })}
    />
  );
};

interface SectionWatermarkProps extends WatermarkProps {
  children?: React.ReactNode;
}

/** Wraps a section and places a watermark behind its content. */
export const SectionWatermark = ({ children, ...watermarkProps }: SectionWatermarkProps): JSX.Element => (
  <Box sx={{ position: 'relative', overflow: 'hidden' }}>
    <Watermark {...watermarkProps} />
    <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
  </Box>
);
