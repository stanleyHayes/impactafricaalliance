import { keyframes } from '@emotion/react';
import { brandColors } from '@iaa/shared';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useReducedMotion } from 'framer-motion';
import { useId, useState } from 'react';
import { useInView } from 'react-intersection-observer';

const revolve = keyframes`
  from { transform: rotateY(0deg) rotateZ(-18deg); }
  to { transform: rotateY(360deg) rotateZ(-18deg); }
`;

/** CSS 3D geometry: no canvas, model downloads, or continuous React renders. */
export const AllianceSculpture = ({
  variant = 'orbit',
}: {
  variant?: 'orbit' | 'seed';
}): JSX.Element => {
  const controlId = useId();
  const reducedMotion = useReducedMotion();
  const { ref, inView } = useInView({ threshold: 0.1 });
  const [paused, setPaused] = useState(false);
  const [angle, setAngle] = useState(24);
  const isPaused = paused || Boolean(reducedMotion);

  return (
    <Box ref={ref} sx={{ width: '100%', maxWidth: 330, mx: 'auto' }}>
      <Box
        onPointerMove={(event) => {
          if (event.pointerType !== 'mouse' || reducedMotion) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          setAngle(Math.round(((event.clientX - bounds.left) / bounds.width - 0.5) * 120));
        }}
        sx={{
          height: { xs: 220, md: 270 },
          display: 'grid',
          placeItems: 'center',
          perspective: '800px',
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 180,
            height: 180,
            transformStyle: 'preserve-3d',
            transform: `rotateX(-18deg) rotateY(${angle}deg)`,
            transition: reducedMotion ? 'none' : 'transform 180ms ease-out',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              transformStyle: 'preserve-3d',
              animation: `${revolve} 28s linear infinite`,
              animationPlayState: isPaused || !inView ? 'paused' : 'running',
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}
          >
            {[0, 60, 120].map((rotation) => (
              <Box
                key={rotation}
                sx={{
                  position: 'absolute',
                  inset: variant === 'seed' ? 14 : 0,
                  borderRadius: variant === 'seed' ? '30% 70% 30% 70%' : '50%',
                  border: `2px solid ${rotation === 60 ? brandColors.gold : brandColors.mint}`,
                  transform: `rotateY(${rotation}deg)`,
                  boxShadow: `inset 0 0 14px ${brandColors.mint}20, 0 0 12px ${brandColors.mint}15`,
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: -7,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: rotation === 60 ? brandColors.gold : brandColors.mint,
                    boxShadow: 'inset -3px -3px 5px rgba(0,0,0,.3)',
                  }}
                />
              </Box>
            ))}
          </Box>
          <Box
            sx={{
              position: 'absolute',
              inset: 55,
              transform: `rotateY(${-angle}deg) rotateX(18deg)`,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 25%, #d2ffe9, ${brandColors.mint} 38%, ${brandColors.deepForest} 95%)`,
              boxShadow: '0 16px 38px rgba(0,0,0,.18)',
            }}
          />
        </Box>
      </Box>
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5}>
        <Typography
          component="label"
          htmlFor={controlId}
          sx={{ fontSize: '.75rem', color: 'inherit' }}
        >
          Rotate
        </Typography>
        <Box
          component="input"
          id={controlId}
          type="range"
          min={-180}
          max={180}
          value={angle}
          onChange={(event) => setAngle(Number(event.target.value))}
          aria-label={`Rotate ${variant} sculpture`}
          sx={{
            width: 100,
            accentColor: brandColors.mint,
            cursor: 'ew-resize',
            '&:focus-visible': { outline: `2px solid ${brandColors.gold}`, outlineOffset: 4 },
          }}
        />
        {!reducedMotion && (
          <IconButton
            size="small"
            onClick={() => setPaused(!paused)}
            aria-label={isPaused ? 'Play sculpture animation' : 'Pause sculpture animation'}
            sx={{ color: 'inherit' }}
          >
            {isPaused ? (
              <PlayArrowRoundedIcon fontSize="small" />
            ) : (
              <PauseRoundedIcon fontSize="small" />
            )}
          </IconButton>
        )}
      </Stack>
    </Box>
  );
};
