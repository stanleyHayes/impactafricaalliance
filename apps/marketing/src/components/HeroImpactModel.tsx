import { brandColors } from '@iaa/shared';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import Stack from '@mui/material/Stack';
import { m, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const ITEMS = [
  { title: 'Skills', text: 'Practical learning that moves with people.', Icon: SchoolRoundedIcon },
  { title: 'Community', text: 'Programmes shaped around local needs.', Icon: GroupsRoundedIcon },
  {
    title: 'Partnership',
    text: 'Shared delivery with trusted allies.',
    Icon: HandshakeRoundedIcon,
  },
];

export const HeroImpactModel = (): JSX.Element => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduceMotion = useReducedMotion();
  const [blocked, setBlocked] = useState(true);
  const replayButton = useRef<HTMLButtonElement>(null);
  const [replay, setReplay] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    // A welcome dialog can otherwise hide the entire entrance from the visitor.
    const check = (): void =>
      setBlocked(
        document.hidden ||
          Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]')).some(
            (dialog) =>
              dialog.getClientRects().length > 0 &&
              getComputedStyle(dialog).visibility !== 'hidden' &&
              !dialog.closest('[aria-hidden="true"]'),
          ),
      );
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'open', 'class'],
    });
    document.addEventListener('visibilitychange', check);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  useEffect(() => {
    if (blocked) {
      setEntered(false);
      return;
    }
    if (inView) setEntered(true);
  }, [blocked, inView]);

  useEffect(() => {
    if (replay > 0) replayButton.current?.focus({ preventScroll: true });
  }, [replay]);

  const visible = reduceMotion || entered;
  return (
    <Box ref={ref} sx={{ ml: 'auto', maxWidth: 390 }}>
      <Box
        key={replay}
        component={m.div}
        initial={reduceMotion ? false : 'hidden'}
        animate={visible ? 'visible' : 'hidden'}
        variants={{
          hidden: { opacity: 0, y: 42, scale: 0.94 },
          visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
              duration: reduceMotion ? 0 : 0.85,
              ease: [0.22, 1, 0.36, 1],
              delayChildren: reduceMotion ? 0 : 0.55,
              staggerChildren: reduceMotion ? 0 : 0.3,
            },
          },
        }}
        sx={{
          p: 2,
          border: '1px solid rgba(255,255,255,.16)',
          borderRadius: 4,
          bgcolor: 'rgba(255,255,255,.08)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: 'rgba(255,255,255,.92)',
            color: brandColors.charcoalBlack,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography
              variant="overline"
              sx={{ color: brandColors.forestGreen, fontWeight: 750, letterSpacing: 1.5 }}
            >
              Our impact model
            </Typography>
            {!reduceMotion && (
              <Tooltip title="Replay animation">
                <IconButton
                  size="small"
                  aria-label="Replay impact model animation"
                  ref={replayButton}
                  onClick={() => setReplay((value) => value + 1)}
                  sx={{
                    color: brandColors.forestGreen,
                    '&:focus-visible': { outline: '2px solid currentColor' },
                  }}
                >
                  <ReplayRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {ITEMS.map(({ title, text, Icon }) => (
              <Box
                key={title}
                component={m.div}
                variants={{
                  hidden: { opacity: 0, y: 28 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: reduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
                sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}
              >
                <Box
                  component={m.div}
                  variants={{
                    hidden: { opacity: 0, rotate: -18, scale: 0.75 },
                    visible: {
                      opacity: 1,
                      rotate: 0,
                      scale: 1,
                      transition: { duration: reduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] },
                    },
                  }}
                  sx={{
                    display: 'grid',
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    placeItems: 'center',
                    borderRadius: 2,
                    bgcolor: 'rgba(0,30,20,.08)',
                    color: brandColors.forestGreen,
                  }}
                >
                  <Icon />
                </Box>
                <Box
                  component={m.div}
                  variants={{
                    hidden: { opacity: 0, x: 20 },
                    visible: {
                      opacity: 1,
                      x: 0,
                      transition: {
                        delay: reduceMotion ? 0 : 0.1,
                        duration: reduceMotion ? 0 : 0.5,
                      },
                    },
                  }}
                >
                  <Typography
                    sx={{ fontWeight: 750, lineHeight: 1.2, color: brandColors.charcoalBlack }}
                  >
                    {title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: brandColors.slate }}>
                    {text}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};
