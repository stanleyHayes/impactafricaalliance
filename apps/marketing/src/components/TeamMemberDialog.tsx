import { brandColors, type TeamMember } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import AutoGraphRoundedIcon from '@mui/icons-material/AutoGraphRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Grow from '@mui/material/Grow';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';

import { IMAGES } from '../content/images';

export interface MemberSocial {
  field: string;
  label: string;
  Icon: SvgIconComponent;
  href: string;
}

interface TeamMemberDialogProps {
  member: TeamMember;
  socials: MemberSocial[];
  initials: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Full profile for one team member. The card shows a photo, a name and links;
 * the whole bio lives here so a long one cannot distort the grid.
 */
export const TeamMemberDialog = ({
  member,
  socials,
  initials,
  open,
  onClose,
}: TeamMemberDialogProps): JSX.Element => {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const role = member.role.toLowerCase();
  const marks: [RegExp, SvgIconComponent][] = [
    [/president|founder|chief/, ExploreRoundedIcon],
    [/country/, PublicRoundedIcon],
    [/communication|marketing|media/, CampaignRoundedIcon],
    [/finance|business|development/, AutoGraphRoundedIcon],
    [/director/, PublicRoundedIcon],
  ];
  const RoleMark = marks.find(([pattern]) => pattern.test(role))?.[1] ?? HubRoundedIcon;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      slots={{ transition: Grow }}
      transitionDuration={reduceMotion ? 0 : { enter: 360, exit: 180 }}
      fullWidth
      scroll="paper"
      aria-labelledby="team-member-name"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            // Fixed frame: bios run to five paragraphs for some members, and
            // letting the dialog grow with the text pushed it past the viewport.
            // The text pane scrolls instead.
            height: { xs: '92vh', sm: 'min(84vh, 660px)' },
            maxHeight: { xs: '92vh', sm: 'min(84vh, 660px)' },
          },
        },
      }}
    >
      <Box sx={{ position: 'relative', height: '100%', minHeight: 0 }}>
        <IconButton
          aria-label="Close profile"
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 2,
            bgcolor: alpha(brandColors.white, 0.9),
            color: brandColors.forest,
            '&:hover': { bgcolor: brandColors.white },
          }}
        >
          <CloseRoundedIcon />
        </IconButton>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={0}
          sx={{ height: '100%', minHeight: 0 }}
        >
          {/*
            With a photo, it fills the panel edge to edge — a portrait framed as
            a small card floating on decorative artwork read as a placeholder,
            not a person. The artwork appears only when there is no photo.
          */}
          <Box
            sx={{
              position: 'relative',
              flexShrink: 0,
              overflow: 'hidden',
              width: { xs: '100%', sm: '40%' },
              height: { xs: 240, sm: '100%' },
              bgcolor: brandColors.deepForest,
              ...(member.photo?.url
                ? {}
                : {
                    backgroundImage: `url(${IMAGES.teamArtwork})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }),
            }}
          >
            {member.photo?.url ? (
              <Box
                component="img"
                src={member.photo.url}
                alt={member.name}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  // Portraits are framed with the face high, so bias the crop
                  // upward rather than centring it in this taller panel.
                  objectPosition: 'center 20%',
                  display: 'block',
                }}
              />
            ) : (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.45))',
                  alignItems: 'flex-end',
                  pb: 3,
                }}
              >
                <Typography
                  sx={{ fontSize: '3rem', fontWeight: 850, color: alpha(brandColors.gold, 0.9) }}
                >
                  {initials}
                </Typography>
              </Box>
            )}
          </Box>

          <Box
            sx={{
              position: 'relative',
              isolation: 'isolate',
              // The one scrolling region. `minHeight: 0` is what lets a flex
              // child actually scroll instead of stretching its parent.
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              p: { xs: 3, sm: 4 },
              minWidth: 0,
              minHeight: 0,
              flex: 1,
            }}
          >
            <RoleMark
              aria-hidden="true"
              sx={{
                position: 'absolute',
                right: -40,
                bottom: -30,
                fontSize: 280,
                opacity: 0.06,
                color: 'text.primary',
                pointerEvents: 'none',
                zIndex: -1,
              }}
            />
            <Typography id="team-member-name" variant="h5" sx={{ pr: 5, lineHeight: 1.25 }}>
              {member.name}
            </Typography>
            <Typography
              sx={{ mt: 0.75, color: 'text.secondary', fontSize: '0.95rem', fontWeight: 750 }}
            >
              {member.role}
            </Typography>

            {member.bio ? (
              <Stack spacing={1.75} sx={{ mt: 2.5 }}>
                {member.bio
                  .split(/\n{2,}|\n/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean)
                  .map((paragraph) => (
                    <Typography
                      key={paragraph.slice(0, 40)}
                      color="text.secondary"
                      sx={{ fontSize: '0.95rem', lineHeight: 1.8 }}
                    >
                      {paragraph}
                    </Typography>
                  ))}
              </Stack>
            ) : (
              <Typography color="text.secondary" sx={{ mt: 2.5, lineHeight: 1.75 }}>
                A full profile for {member.name} is coming soon.
              </Typography>
            )}

            {socials.length > 0 && (
              <Stack direction="row" spacing={0.5} sx={{ mt: 3 }}>
                {socials.map(({ field, label, Icon, href }) => (
                  <IconButton
                    key={field}
                    component="a"
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on ${label}`}
                    size="small"
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      color: 'text.primary',
                      '&:hover': { bgcolor: brandColors.gold, color: brandColors.charcoalBlack },
                    }}
                  >
                    <Icon fontSize="small" />
                  </IconButton>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>
    </Dialog>
  );
};
