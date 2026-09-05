import { keyframes } from '@emotion/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { CSSProperties } from 'react';

const arrive = keyframes`
  from { opacity: .18; filter: blur(5px); transform: translateY(.38em) rotate(1.5deg); }
  to { opacity: 1; filter: blur(0); transform: none; }
`;
const shine = keyframes`
  from { background-position: 100% 50%; }
  to { background-position: 0% 50%; }
`;
const draw = keyframes`
  from { stroke-dashoffset: 1; opacity: 0; }
  to { stroke-dashoffset: 0; opacity: .8; }
`;
const sparkle = keyframes`
  0% { opacity: 0; transform: scale(.8) rotate(-20deg); }
  45% { opacity: 1; transform: scale(1.12) rotate(8deg); }
  100% { opacity: .75; transform: scale(1) rotate(0); }
`;

const empower = keyframes`
  0% { opacity: .3; transform: translateY(.22em) scale(.97); text-shadow: 0 .15em .4em rgba(241,207,120,0); }
  55% { opacity: 1; transform: translateY(-.025em) scale(1.01); text-shadow: 0 0 .22em rgba(241,207,120,.65); }
  100% { opacity: 1; transform: none; text-shadow: 0 0 0 rgba(241,207,120,0); }
`;
const liftSpark = keyframes`
  0% { opacity: 0; transform: translateY(.75em) rotate(-30deg); }
  45% { opacity: 1; transform: translateY(.15em) rotate(15deg); }
  100% { opacity: .8; transform: translateY(0) rotate(0); }
`;
const letterTurn = keyframes`
  from { opacity: .1; transform: perspective(350px) rotateX(-65deg) translateY(.16em); }
  to { opacity: 1; transform: perspective(350px) rotateX(0) translateY(0); }
`;
const orbitSpark = keyframes`
  0% { left: 2%; top: 65%; opacity: 0; transform: rotate(-45deg); }
  25% { left: 10%; top: 5%; opacity: .95; }
  65% { left: 65%; top: -10%; opacity: 1; }
  100% { left: 90%; top: 3%; opacity: .8; transform: rotate(135deg); }
`;

const Spark = ({ className }: { className: string }): JSX.Element => (
  <svg className={className} viewBox="0 0 24 24" focusable="false" aria-hidden="true">
    <path
      d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"
      fill="currentColor"
    />
  </svg>
);

const wordTreatment = (word: string): string => {
  const normalized = word.replace(/[^a-z]/gi, '').toLowerCase();
  if (normalized === 'empowering') return 'empower';
  if (normalized === 'africa') return 'africa';
  return 'standard';
};

/** Kedland-inspired word reveal, with IAA's community emphasis and gold light. */
export const HeroHeadline = ({ text }: { text: string }): JSX.Element => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const communityIndex = words.findIndex((word) => /communities|community/i.test(word));
  const accentIndex = communityIndex < 0 ? words.length - 1 : communityIndex;

  return (
    <Typography
      component="h1"
      variant="h1"
      aria-label={text}
      sx={{
        maxWidth: 760,
        color: 'common.white',
        fontSize: { xs: '2.8rem', sm: '3.5rem', md: '4.65rem' },
        lineHeight: 1.1,
        overflowWrap: 'anywhere',
        '& .headline-word': {
          position: 'relative',
          display: 'inline-block',
          maxWidth: '100%',
          verticalAlign: 'top',
          animation: `${arrive} 720ms cubic-bezier(.22,1,.36,1) both`,
          animationDelay: 'var(--word-delay)',
        },
        '& .headline-empower': {
          animation: `${empower} 1150ms cubic-bezier(.22,1,.36,1) 120ms both`,
          transformOrigin: 'left bottom',
          color: '#FFF6DF',
        },
        '& .headline-africa': { animation: 'none', color: '#BDE8D4' },
        '& .headline-letter': {
          display: 'inline-block',
          transformOrigin: 'center bottom',
          animation: `${letterTurn} 650ms cubic-bezier(.22,1,.36,1) both`,
          animationDelay: 'var(--letter-delay)',
        },
        '& .headline-empower-spark, & .headline-orbit-spark': {
          position: 'absolute',
          width: '.18em',
          height: '.18em',
          pointerEvents: 'none',
        },
        '& .headline-empower-spark': {
          right: '.02em',
          top: '-.09em',
          color: '#F7DE99',
          animation: `${liftSpark} 1000ms cubic-bezier(.22,1,.36,1) 350ms both`,
        },
        '& .headline-orbit-spark': {
          color: '#D8F7E8',
          animation: `${orbitSpark} 1700ms cubic-bezier(.45,0,.25,1) 500ms both`,
        },
        '& .headline-light': {
          color: '#F1CF78',
          '@supports (background-clip: text)': {
            backgroundImage:
              'linear-gradient(110deg, #F1CF78 0%, #F1CF78 30%, #FFFDF2 47%, #F1CF78 64%, #F1CF78 100%)',
            backgroundSize: '250% 100%',
            backgroundPosition: '0% 50%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            animation: `${shine} 1400ms cubic-bezier(.22,1,.36,1) 850ms both`,
          },
        },
        '& .headline-underline': {
          position: 'absolute',
          bottom: '-.13em',
          left: 0,
          width: '100%',
          height: '.17em',
          overflow: 'visible',
          color: '#F1CF78',
          pointerEvents: 'none',
          '& path': {
            strokeDasharray: 1,
            animation: `${draw} 800ms cubic-bezier(.22,1,.36,1) 950ms both`,
          },
        },
        '& .headline-spark': {
          position: 'absolute',
          width: '.24em',
          height: '.24em',
          right: '-.07em',
          top: '-.11em',
          color: '#F7DE99',
          pointerEvents: 'none',
          animation: `${sparkle} 900ms cubic-bezier(.22,1,.36,1) 1250ms both`,
        },
        '& .headline-spark-small': {
          width: '.12em',
          height: '.12em',
          right: '.23em',
          top: '-.22em',
          animationDelay: '1450ms',
        },
        '@media (prefers-reduced-motion: reduce)': {
          '& .headline-word, & .headline-light, & .headline-letter, & .headline-spark, & .headline-empower-spark, & .headline-orbit-spark, & .headline-underline path':
            {
              animation: 'none',
              transform: 'none',
              filter: 'none',
              opacity: 1,
            },
          '& .headline-underline path': { strokeDashoffset: 0 },
          '& .headline-orbit-spark': { left: '90%', top: '3%' },
        },
        '@media (forced-colors: active)': {
          '& .headline-light, & .headline-empower, & .headline-africa': {
            background: 'none',
            color: 'CanvasText',
          },
          '& .headline-spark, & .headline-empower-spark, & .headline-orbit-spark, & .headline-underline':
            { display: 'none' },
        },
      }}
    >
      {words.map((word, index) => (
        <Box component="span" key={index + '-' + word} aria-hidden="true">
          <Box
            component="span"
            className={'headline-word headline-' + wordTreatment(word)}
            style={{ '--word-delay': Math.min(index * 62, 620) + 120 + 'ms' } as CSSProperties}
          >
            <Box
              component="span"
              className={
                index === accentIndex && wordTreatment(word) === 'standard'
                  ? 'headline-light'
                  : undefined
              }
            >
              {wordTreatment(word) === 'africa'
                ? Array.from(word).map((letter, letterIndex) => (
                    <span
                      key={letterIndex}
                      className="headline-letter"
                      style={{ '--letter-delay': 260 + letterIndex * 75 + 'ms' } as CSSProperties}
                    >
                      {letter}
                    </span>
                  ))
                : word}
            </Box>
            {wordTreatment(word) === 'empower' && <Spark className="headline-empower-spark" />}
            {wordTreatment(word) === 'africa' && <Spark className="headline-orbit-spark" />}
            {index === accentIndex && wordTreatment(word) === 'standard' && (
              <>
                <svg
                  className="headline-underline"
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                  focusable="false"
                >
                  <path
                    d="M2 9 Q95 0 198 6"
                    pathLength="1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </svg>
                <svg className="headline-spark" viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"
                    fill="currentColor"
                  />
                </svg>
                <svg
                  className="headline-spark headline-spark-small"
                  viewBox="0 0 24 24"
                  focusable="false"
                >
                  <path
                    d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"
                    fill="currentColor"
                  />
                </svg>
              </>
            )}
          </Box>
          {index < words.length - 1 ? ' ' : ''}
        </Box>
      ))}
    </Typography>
  );
};
