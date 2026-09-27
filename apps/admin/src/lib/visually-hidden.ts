/**
 * Hides an element from sight while keeping it for screen readers, such as a
 * list heading that is also the pagination's focus target when tabs already
 * say it on screen.
 *
 * The sizes are pixel strings because MUI's `sx` reads a bare number from 0
 * to 1 as a fraction: `width: 1` became `width: 100%`, and an absolutely
 * placed heading then stretched the page sideways. The values match MUI's
 * own `visuallyHidden`, copied because `@mui/utils` is not a direct
 * dependency of the console.
 */
export const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
} as const;
