import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

interface OfficeWatermarkProps {
  variant?: 'atlas' | 'streets';
  sx?: SxProps<Theme>;
}

const AtlasLinework = (): JSX.Element => (
  <>
    <path
      d="m36 68 91-27 105 30 92-28v183l-92 29-105-31-91 27Z"
      fill="currentColor"
      fillOpacity="0.045"
      strokeOpacity="0.6"
    />
    <path d="M127 41v183M232 71v184" strokeOpacity="0.45" />
    <path
      d="m36 114 91-27 105 30 92-28M36 159l91-27 105 30 92-28M36 205l91-27 105 30 92-28M81 55v183M180 57v183M277 57v184"
      strokeOpacity="0.22"
    />
    <path
      d="M66 206c29-65 53-91 103-80s72 44 125-43M64 99c55 12 65 83 113 100s85-10 116-36"
      strokeDasharray="3 6"
      strokeOpacity="0.55"
    />
    <circle cx="174" cy="139" r="76" strokeOpacity="0.16" />
    <circle cx="174" cy="139" r="53" strokeOpacity="0.28" />
    <g fill="currentColor" stroke="none">
      <circle cx="66" cy="206" r="4" fillOpacity="0.7" />
      <circle cx="294" cy="83" r="4" fillOpacity="0.7" />
      <circle cx="293" cy="163" r="3" fillOpacity="0.45" />
      <circle cx="64" cy="99" r="3" fillOpacity="0.45" />
    </g>
    <g transform="translate(174 139)" strokeOpacity="0.85">
      <path d="M0 18S-17-1-17-12a17 17 0 0 1 34 0C17-1 0 18 0 18Z" />
      <circle cy="-12" r="5" />
      <ellipse cy="26" rx="15" ry="4" strokeOpacity="0.25" />
    </g>
  </>
);

const StreetLinework = (): JSX.Element => (
  <>
    <path
      d="M6 202c68 5 89-44 128-45s66 50 111 38 62-71 109-80M-9 227c67 7 107-44 143-45s64 47 110 39 69-71 116-81"
      strokeOpacity="0.25"
    />
    <path
      d="m19 70 88 26 34-51 67 17 27-43M19 80l80 24 47-1 15 24 62 12 34-23 74 22M53 22l27 50-28 40 17 57-29 42 22 78M118 9l-11 40 34 45-24 43 23 48-16 57 33 44M221 27l-26 73 28 39-7 39 34 49-9 67M280 17l-23 99 33 34-14 45 35 32-14 68M10 259l71-12 43-5 47 18 68-17 82 18"
      strokeOpacity="0.5"
    />
    <path
      d="m24 33 15 34 37 11M157 16l-11 40 38 10M179 125l-28 19 13 22M294 57l41 12-9 42M79 199l20 29M170 217l30 23M271 235l-2 39"
      strokeOpacity="0.22"
    />
    <path
      d="m93 142 12 26-21 19-11-29ZM172 77l14-25-26-6-7 25ZM304 176l24-15 13 24-26 16Z"
      fill="currentColor"
      fillOpacity="0.055"
      strokeOpacity="0.3"
    />
    <circle cx="224" cy="133" r="82" strokeOpacity="0.12" />
    <circle cx="224" cy="133" r="59" strokeOpacity="0.22" />
    <circle cx="224" cy="133" r="35" strokeOpacity="0.35" />
    <path d="M224 43V32M224 234v-11M134 133h-11M325 133h-11" strokeOpacity="0.35" />
    <g transform="translate(224 133)" strokeOpacity="0.9">
      <path d="M0 17S-16-1-16-11a16 16 0 0 1 32 0C16-1 0 17 0 17Z" />
      <circle cy="-11" r="5" />
    </g>
    <g fill="currentColor" stroke="none" fillOpacity="0.5">
      <circle cx="107" cy="96" r="3" />
      <circle cx="124" cy="242" r="3" />
      <circle cx="311" cy="227" r="3" />
    </g>
  </>
);

/** Decorative map linework; its placement, color, and overall opacity belong to the surface. */
export const OfficeWatermark = ({ variant = 'atlas', sx }: OfficeWatermarkProps): JSX.Element => (
  <Box
    component="svg"
    viewBox="0 0 360 300"
    aria-hidden="true"
    focusable="false"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    sx={[
      { display: 'block', pointerEvents: 'none', width: '100%', height: 'auto' },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {variant === 'atlas' ? <AtlasLinework /> : <StreetLinework />}
  </Box>
);
