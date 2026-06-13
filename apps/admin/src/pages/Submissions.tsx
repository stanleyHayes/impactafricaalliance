import {
  SUBMISSION_STATUSES,
  SUBMISSION_TYPES,
  SubmissionStatus,
  type Submission,
} from '@iaa/shared';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { CardListSkeleton } from '../components/CardListSkeleton';
import { useSubmissions, useUpdateSubmissionStatus } from '../lib/admin-hooks';

const statusColor = (status: SubmissionStatus): 'warning' | 'info' | 'default' => {
  if (status === SubmissionStatus.New) {
    return 'warning';
  }
  return status === SubmissionStatus.Read ? 'info' : 'default';
};

const SubmissionCard = ({ submission }: { submission: Submission }): JSX.Element => {
  const update = useUpdateSubmissionStatus();
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              label={submission.type}
              color="primary"
              sx={{ textTransform: 'capitalize' }}
            />
            <Chip size="small" label={submission.status} color={statusColor(submission.status)} />
            <Typography variant="caption" color="text.secondary">
              {new Date(submission.createdAt).toLocaleString()}
            </Typography>
          </Stack>
          <TextField
            select
            size="small"
            label="Status"
            value={submission.status}
            onChange={(event) =>
              update.mutate({ id: submission.id, status: event.target.value as SubmissionStatus })
            }
            sx={{ minWidth: 140 }}
          >
            {SUBMISSION_STATUSES.map((status) => (
              <MenuItem key={status} value={status} sx={{ textTransform: 'capitalize' }}>
                {status}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Box
          component="dl"
          sx={{
            m: 0,
            display: 'grid',
            gridTemplateColumns: 'max-content 1fr',
            columnGap: 2,
            rowGap: 0.5,
          }}
        >
          {Object.entries(submission.payload).map(([key, value]) => (
            <Box key={key} sx={{ display: 'contents' }}>
              <Typography
                component="dt"
                variant="body2"
                sx={{ fontWeight: 700, textTransform: 'capitalize' }}
              >
                {key}
              </Typography>
              <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                {String(value)}
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

const Submissions = (): JSX.Element => {
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const { data, isLoading } = useSubmissions({ type, status });
  const submissions = data?.items ?? [];

  const renderList = (): JSX.Element => {
    if (isLoading) {
      return <CardListSkeleton />;
    }
    if (submissions.length === 0) {
      return <Typography color="text.secondary">No submissions match these filters.</Typography>;
    }
    return (
      <Stack spacing={2}>
        {submissions.map((submission) => (
          <SubmissionCard key={submission.id} submission={submission} />
        ))}
      </Stack>
    );
  };

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Submissions
      </Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          select
          size="small"
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All types</MenuItem>
          {SUBMISSION_TYPES.map((value) => (
            <MenuItem key={value} value={value} sx={{ textTransform: 'capitalize' }}>
              {value}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {SUBMISSION_STATUSES.map((value) => (
            <MenuItem key={value} value={value} sx={{ textTransform: 'capitalize' }}>
              {value}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {renderList()}
    </>
  );
};

export default Submissions;
