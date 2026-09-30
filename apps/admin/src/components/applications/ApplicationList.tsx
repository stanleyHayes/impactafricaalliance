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
import { surfaceSx } from '../../theme/surfaces';

import { ApplicationStatusChip, RecommendationChip } from './ApplicationChips';

const applicantName = (item: ApplicationListItem): string =>
  item.applicant.name ?? 'Name not given';

const reviewText = (item: ApplicationListItem): string =>
  item.reviewCount === 0
    ? 'No reviews yet'
    : `${item.reviewCount} ${item.reviewCount === 1 ? 'review' : 'reviews'}`;

/**
 * The table's frame: the skin's card, like the submissions and project
 * tables, rather than showing the page's canvas through it. In Classic that
 * is paper with a divider border.
 */
const TABLE_FRAME_SX = {
  display: { xs: 'none', md: 'block' },
  borderRadius: 3,
  ...surfaceSx.card,
} as const;

const COLUMNS = ['Applicant', 'Form', 'Submitted', 'Status', 'Reviews'] as const;

const ColumnHeads = (): JSX.Element => (
  <TableHead>
    <TableRow>
      {COLUMNS.map((column) => (
        <TableCell key={column}>{column}</TableCell>
      ))}
    </TableRow>
  </TableHead>
);

/** Wide screens: a table, each row opening the application. */
const ApplicationTable = ({ items }: { items: ApplicationListItem[] }): JSX.Element => {
  const navigate = useNavigate();
  return (
    <TableContainer sx={TABLE_FRAME_SX}>
      <Table aria-label="Applications">
        <ColumnHeads />
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

/** One card's shape while it loads. */
const CardSkeleton = (): JSX.Element => (
  <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Skeleton variant="text" width="45%" />
        <Skeleton variant="rounded" width={84} height={24} sx={{ borderRadius: 99 }} />
      </Stack>
      <Skeleton variant="text" width="70%" />
      <Skeleton variant="text" width="50%" sx={{ fontSize: '0.75rem' }} />
    </Stack>
  </Card>
);

/**
 * The list's shape while it loads: on wide screens the same paper table with
 * its real column heads and placeholder rows, on narrow ones the cards. The
 * review queue, which shows cards at every width, asks for `cards`.
 */
export const ApplicationListSkeleton = ({
  rows = 6,
  layout = 'table',
}: {
  rows?: number;
  layout?: 'table' | 'cards';
}): JSX.Element => (
  <Box aria-busy="true" aria-label="Loading applications">
    {layout === 'table' && (
      <TableContainer sx={TABLE_FRAME_SX}>
        <Table aria-hidden>
          <ColumnHeads />
          <TableBody>
            {Array.from({ length: rows }, (_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="85%" sx={{ fontSize: '0.875rem' }} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width="70%" />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={120} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="rounded" width={84} height={24} sx={{ borderRadius: 99 }} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={90} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}
    <Box
      sx={{
        display: layout === 'table' ? { xs: 'grid', md: 'none' } : 'grid',
        gap: layout === 'table' ? 1.5 : 2,
        gridTemplateColumns: {
          xs: '1fr',
          md: layout === 'table' ? '1fr' : 'repeat(2, minmax(0, 1fr))',
        },
      }}
      aria-hidden
    >
      {Array.from({ length: Math.min(rows, 4) }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </Box>
  </Box>
);
