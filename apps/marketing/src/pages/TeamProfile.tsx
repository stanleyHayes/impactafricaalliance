import { TEAM_TIER_LABELS, brandFonts, type TeamMember } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import AutoGraphRoundedIcon from '@mui/icons-material/AutoGraphRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import { Box, Button, Container, Divider, Typography } from '@mui/material';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { SectionReveal } from '../components/SectionReveal';
import { Seo } from '../components/Seo';
import { PageSkeleton } from '../components/skeletons';
import { IMAGES } from '../content/images';
import { ApiError } from '../lib/api-client';
import { useTeamMember } from '../lib/content-hooks';
import { memberInitials, memberSocials } from '../lib/team-profile';

const ROLE_MARKS = [
  { pattern: /president|founder|chief/i, Icon: ExploreRoundedIcon },
  { pattern: /country|director/i, Icon: PublicRoundedIcon },
  { pattern: /communication|marketing|media/i, Icon: CampaignRoundedIcon },
  { pattern: /finance|business|development/i, Icon: AutoGraphRoundedIcon },
];

const Portrait = ({ member }: { member: TeamMember }): JSX.Element => {
  const [failedUrl, setFailedUrl] = useState<string>();
  const photo = member.photo?.url;
  const showPhoto = Boolean(photo && failedUrl !== photo);
  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 4, bgcolor: '#183E33' }}>
      <Box
        component="img"
        src={showPhoto ? photo : IMAGES.teamArtwork}
        alt={showPhoto ? member.name : ''}
        onError={() => {
          if (showPhoto) setFailedUrl(photo);
        }}
        sx={{
          display: 'block',
          width: '100%',
          aspectRatio: '4 / 5',
          objectFit: 'cover',
          objectPosition: showPhoto ? 'center 20%' : 'center',
        }}
      />
      {!showPhoto && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(8,34,26,.15)',
          }}
        >
          <Typography
            aria-hidden
            sx={{
              fontFamily: brandFonts.heading,
              fontSize: 'clamp(5rem, 10vw, 9rem)',
              color: '#F4EDDC',
            }}
          >
            {memberInitials(member.name)}
          </Typography>
        </Box>
      )}
      <Box
        sx={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          px: 2,
          py: 1,
          borderRadius: 2,
          bgcolor: '#183E33',
          color: '#F4EDDC',
          border: '1px solid rgba(244,237,220,.2)',
        }}
      >
        <Typography variant="caption" sx={{ letterSpacing: 1.2 }}>
          IMPACT AFRICA ALLIANCE
        </Typography>
      </Box>
    </Box>
  );
};

export const TeamProfileContent = ({ member }: { member: TeamMember }): JSX.Element => {
  const RoleMark =
    ROLE_MARKS.find(({ pattern }) => pattern.test(member.role))?.Icon ?? HubRoundedIcon;
  const socials = memberSocials(member);
  const paragraphs =
    member.bio
      ?.split(/\n+/)
      .map((text) => text.trim())
      .filter(Boolean) ?? [];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Seo
        title={member.name + ' — ' + member.role}
        description={member.name + ', ' + member.role + ' at Impact Africa Alliance.'}
        image={member.photo?.url}
        imageAlt={member.name}
      />
      <Button
        component={RouterLink}
        to="/about#team"
        color="inherit"
        startIcon={<ArrowBackRoundedIcon />}
        sx={{ mb: { xs: 3, md: 4 }, color: 'text.secondary' }}
      >
        Meet the team
      </Button>
      <SectionReveal>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, .82fr) minmax(0, 1.18fr)' },
            gap: { xs: 3, md: 6, lg: 8 },
            alignItems: 'start',
          }}
        >
          <Box
            sx={{
              maxWidth: { xs: 440, md: 'none' },
              width: '100%',
              mx: 'auto',
              position: { md: 'sticky' },
              top: 120,
            }}
          >
            <Portrait member={member} />
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 2, color: 'text.secondary' }}
            >
              <RoleMark sx={{ fontSize: 20 }} />
              <Typography variant="body2">{TEAM_TIER_LABELS[member.tier]}</Typography>
            </Stack>
          </Box>
          <Box component="article" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                position: 'relative',
                overflow: 'hidden',
                pb: 3,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <RoleMark
                aria-hidden
                sx={{
                  position: 'absolute',
                  right: -12,
                  top: 0,
                  fontSize: 200,
                  opacity: 0.045,
                  color: 'text.primary',
                  pointerEvents: 'none',
                }}
              />
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 2 }}>
                The people behind the work
              </Typography>
              <Typography
                component="h1"
                sx={{
                  position: 'relative',
                  mt: 1.5,
                  fontFamily: brandFonts.heading,
                  fontWeight: 600,
                  fontSize: { xs: '2.75rem', md: '3.6rem', lg: '4.3rem' },
                  lineHeight: 1.08,
                  letterSpacing: '-.035em',
                  overflowWrap: 'anywhere',
                }}
              >
                {member.name}
              </Typography>
              <Typography
                sx={{ mt: 2, fontSize: { xs: '1.05rem', md: '1.2rem' }, color: 'text.secondary' }}
              >
                {member.role}
              </Typography>
            </Box>
            <Box sx={{ py: 3.5 }}>
              <Typography
                component="h2"
                variant="overline"
                sx={{ color: 'text.secondary', letterSpacing: 1.5 }}
              >
                Biography
              </Typography>
              <Stack spacing={2.25} sx={{ mt: 2 }}>
                {paragraphs.length ? (
                  paragraphs.map((paragraph, index) => (
                    <Typography
                      key={index + '-' + paragraph.slice(0, 20)}
                      sx={{
                        fontSize: '1.03rem',
                        lineHeight: 1.9,
                        overflowWrap: 'anywhere',
                        color: index === 0 ? 'text.primary' : 'text.secondary',
                        '&:first-of-type': { fontSize: '1.13rem', lineHeight: 1.8 },
                      }}
                    >
                      {paragraph}
                    </Typography>
                  ))
                ) : (
                  <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                    {member.name} serves as {member.role} at Impact Africa Alliance. Their full
                    biography will be shared here soon.
                  </Typography>
                )}
              </Stack>
            </Box>
            {socials.length > 0 && (
              <Box
                sx={{
                  p: 2.5,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 3,
                  bgcolor: (theme) => alpha(theme.palette.text.secondary, 0.045),
                }}
              >
                <Typography variant="overline" color="text.secondary">
                  Connect with {member.name.split(' ')[0]}
                </Typography>
                <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} sx={{ mt: 1 }}>
                  {socials.map(({ field, label, Icon, href }) => (
                    <Button
                      key={field}
                      component="a"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="inherit"
                      startIcon={<Icon />}
                      endIcon={<ArrowOutwardRoundedIcon sx={{ fontSize: 16 }} />}
                      sx={{ fontSize: '.85rem' }}
                    >
                      {label}
                    </Button>
                  ))}
                </Stack>
              </Box>
            )}
            <Divider sx={{ mt: 4, mb: 2 }} />
            <Button
              component={RouterLink}
              to="/about#team"
              color="inherit"
              endIcon={<ArrowOutwardRoundedIcon />}
            >
              More people. One shared purpose.
            </Button>
          </Box>
        </Box>
      </SectionReveal>
    </Container>
  );
};

const TeamProfile = (): JSX.Element => {
  const { memberId } = useParams<{ memberId: string }>();
  const { data: member, isLoading, error, refetch } = useTeamMember(memberId ?? '');
  const isError = Boolean(error && !(error instanceof ApiError && error.status === 404));
  if (isLoading) return <PageSkeleton />;
  if (error || !member || !member.isActive) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Seo title="Team profile" noindex />
        <HubRoundedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography component="h1" variant="h4">
          {isError ? 'This profile couldn’t load.' : 'Profile unavailable.'}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 2, mb: 3 }}>
          {isError
            ? 'Please try again to read this team member’s story.'
            : 'This profile may no longer be published. Meet the rest of the team below.'}
        </Typography>
        {isError && (
          <Button
            variant="outlined"
            onClick={() => {
              void refetch();
            }}
            sx={{ mr: 1 }}
          >
            Try again
          </Button>
        )}
        <Button
          component={RouterLink}
          to="/about#team"
          color="inherit"
          startIcon={<ArrowBackRoundedIcon />}
        >
          Meet the team
        </Button>
      </Container>
    );
  }
  return <TeamProfileContent key={member.id} member={member} />;
};

export default TeamProfile;
