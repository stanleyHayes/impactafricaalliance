import type { ApplicationListItem } from '@iaa/shared';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { formatInstant } from '../../lib/forms';

import { ApplicationStatusChip, RecommendationChip } from './ApplicationChips';

const applicantName = (item: ApplicationListItem): string =>
  item.applicant.name ?? 'Name not given';

const reviewText = (item: ApplicationListItem): string =>
  item.reviewCount === 0
    ? 'No reviews yet'
    : `${item.reviewCount} ${item.reviewCount === 1 ? 'review' : 'reviews'}`;

/** Wide screens: a table, each row opening the application. */
const ApplicationTable = ({ items }: { items: ApplicationListItem[] }): JSX.Element => {
  const navigate = useNavigate();
  return (
    <TableContainer
      sx={{
        display: { xs: 'none', md: 'block' },
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
      }}
    >
      <Table aria-label="Applications">
        <TableHead>
          <TableRow>
            <TableCell>Applicant</TableCell>
            <TableCell>Form</TableCell>
            <TableCell>Submitted</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Reviews</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              hover
              onClick={() => navigate(`/applications/${item.id}`)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>
                <Link
                  component={RouterLink}
                  to={`/applications/${item.id}`}
                  onClick={(event) => event.stopPropagation()}
                  sx={{ fontWeight: 600 }}
                >
                  {applicantName(item)}
                </Link>
                <Typography variant="body2" color="text.secondary">
                  {item.reference}
                  {item.applicant.email ? ` · ${item.applicant.email}` : ''}
                </Typography>
              </TableCell>
              <TableCell>{item.form.title}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatInstant(item.submittedAt)}</TableCell>
              <TableCell>
                <ApplicationStatusChip status={item.status} />
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {reviewText(item)}
                  </Typography>
                  {item.lastRecommendation && (
                    <RecommendationChip recommendation={item.lastRecommendation} />
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

/** One application as a card, for phones and for the review queue. */
export const ApplicationCard = ({
  item,
  footer,
}: {
  item: ApplicationListItem;
  /** Extra controls under the card, such as the queue's quick actions. */
  footer?: JSX.Element;
}): JSX.Element => (
  <Card variant="outlined" sx={{ borderRadius: 3 }}>
    <CardActionArea component={RouterLink} to={`/applications/${item.id}`} sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontWeight: 700, minWidth: 0, overflowWrap: 'anywhere' }}>
            {applicantName(item)}
          </Typography>
          <ApplicationStatusChip status={item.status} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
          {item.reference} · {item.form.title}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ flexWrap: 'wrap', rowGap: 0.5 }}
        >
          <Typography variant="caption" color="text.secondary">
            {formatInstant(item.submittedAt)} · {reviewText(item)}
          </Typography>
          {item.lastRecommendation && (
            <RecommendationChip recommendation={item.lastRecommendation} />
          )}
        </Stack>
      </Stack>
    </CardActionArea>
    {footer}
  </Card>
);

/** Applications as a table on wide screens and cards on narrow ones. */
export const ApplicationList = ({ items }: { items: ApplicationListItem[] }): JSX.Element => (
  <>
    <ApplicationTable items={items} />
    <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {items.map((item) => (
        <ApplicationCard key={item.id} item={item} />
      ))}
    </Stack>
  </>
);

/** The list's shape while it loads: rows on wide screens, cards on narrow ones. */
export const ApplicationListSkeleton = ({ rows = 6 }: { rows?: number }): JSX.Element => (
  <Box aria-busy="true" aria-label="Loading applications">
    <Stack spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
      <Skeleton variant="rounded" height={48} />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={64} />
      ))}
    </Stack>
    <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {Array.from({ length: Math.min(rows, 4) }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={112} sx={{ borderRadius: 3 }} />
      ))}
    </Stack>
  </Box>
);
