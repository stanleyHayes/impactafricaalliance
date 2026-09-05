import { formatStatValue } from '@iaa/shared';
import Typography from '@mui/material/Typography';
import { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  durationMs?: number;
  color?: string;
  size?: 'standard' | 'display';
}

const easeOutQuad = (t: number): number => t * (2 - t);

/**
 * Counts up from zero to `value` when scrolled into view (Intersection Observer),
 * per the homepage Impact section spec. Renders the final value immediately for
 * users who prefer reduced motion.
 *
 * The displayed number is written directly to a DOM node during the animation
 * to avoid ~120 React re-renders per counter.
 */
export const AnimatedCounter = ({
  value,
  suffix = '',
  durationMs = 2000,
  color = 'secondary.main',
  size = 'standard',
}: AnimatedCounterProps): JSX.Element => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.4 });
  const nodeRef = useRef<HTMLSpanElement | null>(null);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!inView) {
      return undefined;
    }

    const node = nodeRef.current;
    if (!node) {
      return undefined;
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      node.textContent = formatStatValue(value, suffix);
      return undefined;
    }

    let start: number | null = null;
    const step = (timestamp: number): void => {
      start ??= timestamp;
      const progress = Math.min((timestamp - start) / durationMs, 1);
      const current = Math.round(easeOutQuad(progress) * value);
      node.textContent = formatStatValue(current, suffix);
      if (progress < 1) {
        frame.current = requestAnimationFrame(step);
      }
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current) {
        cancelAnimationFrame(frame.current);
      }
    };
  }, [inView, value, suffix, durationMs]);

  return (
    <Typography
      ref={ref}
      component="span"
      sx={{
        display: 'block',
        fontWeight: 800,
        color,
        lineHeight: 1.1,
        fontSize:
          size === 'display'
            ? { xs: '3.2rem', sm: '4rem', md: '5rem' }
            : { xs: '1.8rem', sm: '2.4rem', md: '3rem' },
        maxWidth: '100%',
        overflowWrap: 'anywhere',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span ref={nodeRef}>{formatStatValue(0, suffix)}</span>
    </Typography>
  );
};
