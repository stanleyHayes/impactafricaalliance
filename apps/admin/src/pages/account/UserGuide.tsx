import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';

import { useTour } from '../../components/tour';

interface GuideSection {
  title: string;
  body: string;
}

const SECTIONS: GuideSection[] = [
  {
    title: 'Getting around',
    body: 'The left sidebar is organised into Overview (Dashboard), Content (articles, stories, team, partners, reports, jobs, stats), Operations (submissions, subscribers, donations, privacy requests, users), Site settings, and your Account. Click any item to jump there.',
  },
  {
    title: 'Dashboard at a glance',
    body: 'The Dashboard shows summary cards for submissions, subscribers, donations and recent inbound activity. Use the quick-action buttons to review submissions or open the newsletter list.',
  },
  {
    title: 'Managing content',
    body: 'Each content type has its own page. You can create, edit, view details and delete records. Changes are saved through the API and reflected on the public website.',
  },
  {
    title: 'Users and permissions',
    body: 'Administrators can invite team members and assign roles. Editors can manage content but cannot invite users or change site-wide settings.',
  },
  {
    title: 'Notifications',
    body: 'The bell icon in the top bar shows new submissions. You can turn the unread badge on or off from Account → Settings.',
  },
  {
    title: 'Page help',
    body: 'Look for the ? button near the page title. It opens a short guide for that page and can read the steps aloud.',
  },
  {
    title: 'Themes',
    body: 'Use the palette icon in the top bar to switch brand themes (IAA, Aura, Ocean, Sunset). The sun / moon icon toggles between light and dark modes. Your choices are remembered on this device.',
  },
];

/** Standalone user guide page, reachable from the account menu. */
const UserGuide = (): JSX.Element => {
  const { start: startTour } = useTour();
  const navigate = useNavigate();

  const handleStartTour = (): void => {
    navigate('/');
    // Allow the dashboard to render before anchoring the tour.
    window.setTimeout(() => startTour(), 100);
  };

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              User guide
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A quick reference for the IAA Admin console.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<ExploreOutlinedIcon />} onClick={handleStartTour}>
            Show me around
          </Button>
        </Stack>

        <Stack spacing={2}>
          {SECTIONS.map((section) => (
            <Card key={section.title} variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>
                  {section.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {section.body}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
};

export default UserGuide;
