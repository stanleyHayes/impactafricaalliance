import Box from '@mui/material/Box';

/** A small visual story: people connected by a shared path into opportunity. */
export const AllianceArtwork = (): JSX.Element => (
  <Box
    component="svg"
    viewBox="0 0 560 360"
    aria-hidden
    focusable="false"
    sx={{ display: 'block', width: '100%', maxWidth: 560, mx: 'auto' }}
  >
    <g fill="none" stroke="#A9C6B6" strokeWidth="1" opacity=".24">
      <circle cx="282" cy="180" r="158" />
      <circle cx="282" cy="180" r="122" />
      <path d="M40 280 170 94 290 248 450 65 520 260M170 94 450 65M40 280 290 248 520 260" />
    </g>
    <path d="M221 322V152a86 86 0 0 1 172 0v170" fill="#95B9A0" />
    <path d="M249 322V155a58 58 0 0 1 116 0v167" fill="#183E33" />
    <circle cx="424" cy="81" r="38" fill="#EAC35A" />
    <path
      d="M424 29v-9m0 122v-9m52-52h9m-122 0h9m89-37 7-7m-87 87 7-7"
      stroke="#EAC35A"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path d="M100 320v-76a62 62 0 0 1 124 0v76" fill="#D8876B" />
    <circle cx="162" cy="143" r="30" fill="#EAC8A5" />
    <path d="M132 141a30 30 0 0 1 60 0v-8h-60" fill="#182F28" />
    <path d="M342 320v-51a54 54 0 0 1 108 0v51" fill="#A5A8CC" />
    <circle cx="396" cy="183" r="27" fill="#B77955" />
    <path d="M369 182a27 27 0 0 1 54 0l-12-20-24 3z" fill="#182F28" />
    <path
      d="m194 232 62 34 44-45"
      fill="none"
      stroke="#EAC8A5"
      strokeWidth="18"
      strokeLinecap="round"
    />
    <path d="m365 263-50-33" fill="none" stroke="#B77955" strokeWidth="17" strokeLinecap="round" />
    <path d="M46 323h466" stroke="#C4D1BF" strokeWidth="2" strokeLinecap="round" opacity=".5" />
    <path
      d="M74 320v-65m0 39c-24 0-32-15-32-31 23 0 32 13 32 31m0-20c23 0 31-14 31-30-21 0-31 14-31 30"
      fill="#95B9A0"
    />
    <g fill="#EAC35A">
      <circle cx="170" cy="94" r="4" />
      <circle cx="520" cy="260" r="4" />
      <circle cx="282" cy="22" r="4" />
    </g>
  </Box>
);
