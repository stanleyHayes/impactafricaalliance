import type { PersonSummary, Project } from '@iaa/shared';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { DetailSection } from '../../components/detail/DetailSection';
import { Markdown } from '../../components/markdown/Markdown';
import { countLabel, sdgLabel } from '../../components/projects/project-format';
import { useProjectOutlet } from '../../components/projects/useProjectOutlet';
import { initials } from '../../lib/initials';
import { skinned, surfaceSx } from '../../theme/surfaces';

const Quiet = ({ children }: { children: ReactNode }): JSX.Element => (
  <Typography variant="body2" color="text.secondary">
    {children}
  </Typography>
);

const Person = ({ person, role }: { person: PersonSummary; role?: string }): JSX.Element => (
  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
    <Avatar
      aria-hidden
      sx={{
        width: 34,
        height: 34,
        fontSize: '0.8rem',
        fontWeight: 750,
        color: 'text.primary',
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.18),
      }}
    >
      {initials(person.name)}
    </Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 650 }} noWrap>
        {person.name}
        {role ? ` · ${role}` : ''}
      </Typography>
      <Link href={`mailto:${person.email}`} variant="caption" color="text.secondary" noWrap>
        {person.email}
      </Link>
    </Box>
  </Stack>
);

/** The numbers that say how the project stands, each one a count the reader can check. */
const keyNumbers = (project: Project): { label: string; value: string; note?: string }[] => {
  const milestonesDone = project.milestones.filter((item) => item.status === 'done').length;
  const shareable = project.media.filter((item) => item.shareable).length;
  return [
    {
      label: 'Tasks',
      value: String(project.taskCounts.total),
      note: `${project.taskCounts.open} open · ${project.taskCounts.done} done`,
    },
    {
      label: 'Overdue tasks',
      value: String(project.taskCounts.overdue),
      note: project.taskCounts.overdue > 0 ? 'Past their due date' : 'Nothing late',
    },
    {
      label: 'Milestones & activities',
      value: `${milestonesDone} of ${project.milestones.length}`,
      note: 'Done',
    },
    {
      label: 'Photos',
      value: String(project.media.length),
      note: `${shareable} cleared for public use`,
    },
    { label: 'Documents', value: String(project.documents.length) },
    { label: 'Impact stories', value: String(project.storyCount) },
  ];
};

/**
 * A key number's tile. Classic draws an outline on the section's paper; the
 * other skins sink it into the section as a well, so the figures read as
 * readouts rather than more cards to press.
 */
const keyNumberSx = skinned({ border: 1, borderColor: 'divider' }, surfaceSx.inset);

const KeyNumbers = ({ project }: { project: Project }): JSX.Element => (
  <Box
    component="dl"
    sx={{
      m: 0,
      display: 'grid',
      gap: 1.5,
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    }}
  >
    {keyNumbers(project).map((item) => (
      <Box key={item.label} sx={[{ p: 1.5, borderRadius: 2.5, minWidth: 0 }, keyNumberSx]}>
        <Typography
          component="dt"
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 650 }}
        >
          {item.label}
        </Typography>
        <Typography component="dd" sx={{ m: 0 }}>
          <Box component="span" sx={{ display: 'block', fontSize: '1.4rem', fontWeight: 750 }}>
            {item.value}
          </Box>
          {item.note && (
            <Box
              component="span"
              sx={{ display: 'block', fontSize: '0.75rem', color: 'text.secondary' }}
            >
              {item.note}
            </Box>
          )}
        </Typography>
      </Box>
    ))}
  </Box>
);

const placeLines = (project: Project): string[] =>
  [project.locationText, project.region, project.country].filter((line): line is string =>
    Boolean(line),
  );

/**
 * The project's Overview tab: what it is for, who is on it, where it happens
 * and how it stands, in one read.
 */
const ProjectOverviewTab = (): JSX.Element => {
  const { project } = useProjectOutlet();
  const place = placeLines(project);
  const others = project.members.filter((member) => member.id !== project.lead?.id);
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' },
        alignItems: 'start',
      }}
    >
      <Stack spacing={3} sx={{ minWidth: 0 }}>
        <DetailSection title="About the project" icon={<ArticleOutlinedIcon />}>
          <Typography sx={{ fontWeight: 600, mb: 2 }}>{project.summary}</Typography>
          {project.description.trim() ? (
            <Markdown>{project.description}</Markdown>
          ) : (
            <Quiet>No description yet. Add one with Edit, under Story & cover.</Quiet>
          )}
          {project.tags.length > 0 && (
            <Stack
              direction="row"
              spacing={0.75}
              useFlexGap
              flexWrap="wrap"
              sx={{ mt: 2 }}
              aria-label="Tags"
            >
              {project.tags.map((tag) => (
                <Chip key={tag} size="small" variant="outlined" label={tag} />
              ))}
            </Stack>
          )}
        </DetailSection>
        <DetailSection title="Objectives" icon={<TrackChangesOutlinedIcon />}>
          {project.objectives.length > 0 ? (
            <Box component="ol" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 1 }}>
              {project.objectives.map((objective, index) => (
                <Typography component="li" variant="body2" key={index}>
                  {objective}
                </Typography>
              ))}
            </Box>
          ) : (
            <Quiet>No objectives set. Add them with Edit, under Scope.</Quiet>
          )}
        </DetailSection>
        <DetailSection title="Partners" icon={<HandshakeOutlinedIcon />}>
          {project.partners.length > 0 ? (
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1.5 }}>
              {project.partners.map((partner, index) => (
                <Box component="li" key={index}>
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>
                    {partner.url ? (
                      <Link
                        href={partner.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${partner.name} (opens in a new tab)`}
                      >
                        {partner.name}
                        <OpenInNewRoundedIcon
                          aria-hidden
                          sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'middle' }}
                        />
                      </Link>
                    ) : (
                      partner.name
                    )}
                  </Typography>
                  {partner.role && <Quiet>{partner.role}</Quiet>}
                </Box>
              ))}
            </Box>
          ) : (
            <Quiet>No partners recorded.</Quiet>
          )}
        </DetailSection>
        <DetailSection title="Sustainable Development Goals" icon={<PublicOutlinedIcon />}>
          {project.sdgs.length > 0 ? (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {project.sdgs.map((goal) => (
                <Chip key={goal} label={sdgLabel(goal)} />
              ))}
            </Stack>
          ) : (
            <Quiet>No goals chosen yet.</Quiet>
          )}
        </DetailSection>
      </Stack>
      <Stack spacing={3} sx={{ minWidth: 0 }}>
        <DetailSection title="Key numbers" icon={<InsightsOutlinedIcon />}>
          <KeyNumbers project={project} />
        </DetailSection>
        <DetailSection
          title="People"
          icon={<GroupsOutlinedIcon />}
          description={countLabel(others.length + (project.lead ? 1 : 0), 'person', 'people')}
        >
          <Stack spacing={1.5}>
            {project.lead ? (
              <Person person={project.lead} role="Lead" />
            ) : (
              <Quiet>No lead yet.</Quiet>
            )}
            {others.map((member) => (
              <Person key={member.id} person={member} />
            ))}
          </Stack>
        </DetailSection>
        <DetailSection title="Where" icon={<PlaceOutlinedIcon />}>
          {place.length > 0 ? (
            <Stack spacing={0.5}>
              {place.map((line) => (
                <Typography key={line} variant="body2">
                  {line}
                </Typography>
              ))}
            </Stack>
          ) : (
            <Quiet>No place recorded.</Quiet>
          )}
        </DetailSection>
      </Stack>
    </Box>
  );
};

export default ProjectOverviewTab;
