import type { Transition, Variants } from 'framer-motion';

/**
 * One motion vocabulary for the whole site.
 *
 * The programmes are about moving people from where they are to where they
 * could be, so everything here rises and settles: elements enter from below
 * and land. Nothing bounces, drifts sideways, or overshoots.
 *
 * `settle` is the curve the header pill and photo hovers already used; reusing
 * it is what keeps a scroll reveal and a button hover feeling like one system.
 */
export const easing = {
  /** Decelerates hard at the end — arrives rather than glides to a stop. */
  settle: [0.22, 1, 0.36, 1],
  /** Symmetrical, for things that move and come back (hover in/out). */
  standard: [0.4, 0, 0.2, 1],
} as const;

export const duration = {
  /** Hover and focus. Fast enough to feel like a direct response. */
  quick: 0.18,
  /** The default for anything entering the viewport. */
  base: 0.42,
  /** Hero headings and the page transition. */
  slow: 0.62,
} as const;

/** How far something travels as it rises. Small enough to read as settling. */
export const rise = {
  sm: 10,
  md: 22,
  lg: 34,
} as const;

export const transitions = {
  hover: { duration: duration.quick, ease: easing.standard } satisfies Transition,
  enter: { duration: duration.base, ease: easing.settle } satisfies Transition,
  hero: { duration: duration.slow, ease: easing.settle } satisfies Transition,
};

/** Children rise in sequence; the gap is short so a grid reads as one gesture. */
export const staggerParent = (stagger = 0.06, delay = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

export const riseChild = (distance: number = rise.md): Variants => ({
  hidden: { opacity: 0, y: distance },
  visible: { opacity: 1, y: 0, transition: transitions.enter },
});

/**
 * Reduced motion keeps the same choreography and removes the travel, so the
 * sequencing still communicates order without anything sliding.
 */
export const staticChild: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.quick } },
};

/** Standard viewport trigger: fire once, slightly before the element is centred. */
export const inView = { once: true, amount: 0.25, margin: '0px 0px -80px 0px' } as const;
