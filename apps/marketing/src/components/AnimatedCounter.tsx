import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  durationMs?: number;
}

const easeOutQuad = (t: number): number => t * (2 - t);

/**
 * Counts up from zero to `value` when scrolled into view (Intersection Observer),
 * per the homepage Impact section spec. Renders the final value immediately for
 * users who prefer reduced motion.
 */
export const AnimatedCounter = ({
  value,
  suffix = '',
  durationMs = 2000,
}: AnimatedCounterProps): JSX.Element => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.4 });
  const [display, setDisplay] = useState(0);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!inView) {
      return undefined;
    }
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplay(value);
      return undefined;
    }
    let start: number | null = null;
    const step = (timestamp: number): void => {
      start ??= timestamp;
      const progress = Math.min((timestamp - start) / durationMs, 1);
      setDisplay(Math.round(easeOutQuad(progress) * value));
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
  }, [inView, value, durationMs]);

  return (
    <Typography
      ref={ref}
      component="span"
      variant="h2"
      sx={{ fontWeight: 800, color: 'secondary.main' }}
    >
      {display.toLocaleString()}
      {suffix}
    </Typography>
  );
};
