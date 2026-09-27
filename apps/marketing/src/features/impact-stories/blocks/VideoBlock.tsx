import { brandColors, videoEmbedUrl } from '@iaa/shared';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';

import { BlockFrame, type StoryBlockProps } from './frame';

const providerOf = (embed: string): string =>
  embed.includes('player.vimeo.com') ? 'Vimeo' : 'YouTube';

// Pressing play is the visitor's request to watch, so the player starts at once.
const autoplaying = (embed: string): string =>
  `${embed}${embed.includes('?') ? '&' : '?'}autoplay=1`;

/**
 * A YouTube or Vimeo video that loads nothing from either until the visitor
 * asks for it.
 *
 * The frame, and with it every request to the video host, is only added
 * after a press on the play button, so reading the story never tells YouTube
 * or Vimeo anyone was here. YouTube plays from its no-cookie domain and the
 * address is rebuilt from the video's id (`videoEmbedUrl`), so nothing else
 * in the stored link reaches the page.
 */
export const VideoBlock = ({ data }: StoryBlockProps<'video'>): JSX.Element | null => {
  const [playing, setPlaying] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const embed = videoEmbedUrl(data.url);

  useEffect(() => {
    // Keyboard and screen-reader users land on the player they just started.
    if (playing) frame.current?.focus();
  }, [playing]);

  if (!embed) return null;
  const provider = providerOf(embed);
  const title = data.caption ? `Video: ${data.caption}` : 'Video from this story';

  return (
    <BlockFrame width="wide">
      <Box component="figure" sx={{ m: 0 }}>
        <Box
          sx={{
            position: 'relative',
            aspectRatio: '16 / 9',
            overflow: 'hidden',
            borderRadius: { xs: 2, md: 4 },
            bgcolor: brandColors.deepForest,
          }}
        >
          {playing ? (
            <Box
              component="iframe"
              ref={frame}
              src={autoplaying(embed)}
              title={title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <ButtonBase
              onClick={() => setPlaying(true)}
              aria-label={`Play video${data.caption ? `: ${data.caption}` : ''} (loads from ${provider})`}
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                color: 'common.white',
                background: `radial-gradient(circle at 30% 20%, ${alpha(brandColors.gold, 0.2)}, transparent 45%), ${brandColors.deepForest}`,
                '&:hover .play-disc, &.Mui-focusVisible .play-disc': { transform: 'scale(1.06)' },
                '&.Mui-focusVisible': { outline: '3px solid', outlineColor: 'secondary.main' },
                '@media (prefers-reduced-motion: reduce)': {
                  '& .play-disc': { transition: 'none' },
                },
              }}
            >
              <Box
                className="play-disc"
                aria-hidden
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  width: { xs: 64, md: 84 },
                  height: { xs: 64, md: 84 },
                  borderRadius: '50%',
                  bgcolor: 'secondary.main',
                  color: brandColors.charcoalBlack,
                  transition: 'transform 180ms ease',
                }}
              >
                <PlayArrowRoundedIcon sx={{ fontSize: { xs: 38, md: 48 } }} />
              </Box>
              <Typography
                variant="body2"
                sx={{ maxWidth: 420, px: 3, color: 'rgba(255,255,255,0.82)' }}
              >
                Plays from {provider}. Nothing loads from {provider} until you press play.
              </Typography>
            </ButtonBase>
          )}
        </Box>
        {data.caption && (
          <Typography
            component="figcaption"
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1.5, textAlign: 'center' }}
          >
            {data.caption}
          </Typography>
        )}
      </Box>
    </BlockFrame>
  );
};
