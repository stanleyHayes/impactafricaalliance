import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { useSubmissions } from '../lib/admin-hooks';
import { RESOURCES } from '../resources/registry';

const Dashboard = (): JSX.Element => {
  const { user } = useAuth();
  const newSubmissions = useSubmissions({ status: 'new' });

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user?.name.split(' ')[0] ?? 'there'}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Manage the Impact Africa Alliance website content and review inbound activity.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: 'primary.main', color: 'common.white' }}>
            <CardActionArea component={RouterLink} to="/submissions">
              <CardContent>
                <Typography variant="h3">{newSubmissions.data?.total ?? '—'}</Typography>
                <Typography>New submissions</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        {RESOURCES.map((resource) => (
          <Grid key={resource.key} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined">
              <CardActionArea component={RouterLink} to={`/content/${resource.key}`}>
                <CardContent>
                  <Typography variant="h6">{resource.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage {resource.label.toLowerCase()}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
};

export default Dashboard;
