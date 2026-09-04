import { brandColors, type TeamMember } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

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
}: TeamMemberDialogProps): JSX.Element => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="sm"
    fullWidth
    scroll="body"
    aria-labelledby="team-member-name"
    slotProps={{ paper: { sx: { borderRadius: 4, overflow: 'hidden' } } }}
  >
    <Box sx={{ position: 'relative' }}>
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

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0}>
        <Box
          sx={{
            position: 'relative',
            flexShrink: 0,
            width: { xs: '100%', sm: 200 },
            minHeight: { xs: 240, sm: 'auto' },
            bgcolor: brandColors.deepForest,
          }}
        >
          {member.photo?.url ? (
            <Box
              component="img"
              src={member.photo.url}
              alt={member.name}
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `radial-gradient(circle at 30% 20%, ${alpha(brandColors.forest, 0.85)}, ${brandColors.deepForest})`,
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

        <Box sx={{ p: { xs: 3, sm: 4 }, minWidth: 0 }}>
          <Typography id="team-member-name" variant="h5" sx={{ pr: 5, lineHeight: 1.25 }}>
            {member.name}
          </Typography>
          <Typography
            sx={{ mt: 0.75, color: brandColors.forest, fontSize: '0.95rem', fontWeight: 750 }}
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
                    border: `1px solid ${alpha(brandColors.deepForest, 0.16)}`,
                    color: brandColors.forest,
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
