import Box from '@mui/material/Box';

/** The width the dot and its spacing take: about a space, a dot and a space. */
const DOT = '0.8em';

/**
 * Parts on one line with a dot between them, "GH₵6,050 · $3,670", that wraps between
 * parts and never leaves a dot at the end or the start of a line.
 *
 * Each part brings its own dot (before it, or after it when the line is set to the end).
 * The row is pulled one dot-width past the clipped edge, so the dot of a part that opens
 * (or closes) a line falls outside and is cut, while those between parts show.
 */
export const DotList = ({
  parts,
  align = 'start',
}: {
  parts: readonly string[];
  /** The side lines are set against; the dots hide on that side. */
  align?: 'start' | 'end';
}): JSX.Element => {
  const end = align === 'end';
  const dot = (
    <Box
      component="span"
      aria-hidden
      sx={{ display: 'inline-block', width: DOT, textAlign: 'center' }}
    >
      ·
    </Box>
  );
  return (
    // Clipped across only, so tall glyphs keep their tops; `clip` also keeps the pulled-out
    // row from widening the page, and the clip path covers browsers without it.
    <Box component="span" sx={{ display: 'block', overflowX: 'clip', clipPath: 'inset(-0.5em 0)' }}>
      <Box
        component="span"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: end ? 'flex-end' : 'flex-start',
          [end ? 'marginInlineEnd' : 'marginInlineStart']: `-${DOT}`,
        }}
      >
        {parts.map((part) => (
          <Box key={part} component="span" sx={{ whiteSpace: 'nowrap' }}>
            {!end && dot}
            {part}
            {end && dot}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
