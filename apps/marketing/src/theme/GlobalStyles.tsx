import GlobalStyles from '@mui/material/GlobalStyles';

export const ViewTransitionStyles = (): JSX.Element => (
  <GlobalStyles
    styles={{
      '@supports (view-transition-name: root)': {
        '::view-transition-old(root), ::view-transition-new(root)': {
          animation: 'none',
          mixBlendMode: 'normal',
        },
        '::view-transition-new(root)': {
          clipPath: 'circle(0% at var(--reveal-x, 50%) var(--reveal-y, 50%))',
          animation: 'circular-reveal 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        },
        '@keyframes circular-reveal': {
          to: {
            clipPath: 'circle(150% at var(--reveal-x, 50%) var(--reveal-y, 50%))',
          },
        },
      },
    }}
  />
);
