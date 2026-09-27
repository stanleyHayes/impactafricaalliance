import type { FormListItem, FormStatus, FormType } from '@iaa/shared';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import RecordVoiceOverOutlinedIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';

import { useCan } from '../../auth/useCan';
import { ServerPagination, usePageParam } from '../../components/data/ServerPagination';
import { EmptyState } from '../../components/EmptyState';
import { OptionSelect } from '../../components/fields/OptionSelect';
import { PageHeader } from '../../components/PageHeader';
import { formatInstant, useForms, type FormListParams } from '../../lib/forms';
import { pageGuides } from '../../lib/page-guides';
import { FORM_TYPE_OPTIONS, withAnyOption } from '../../lib/select-options';
import { useDebouncedValue } from '../../lib/use-debounced-value';

import { FormStatusChip } from './FormStatusChip';

const PAGE_SIZE = 12;

type TabValue = '' | FormStatus | 'archived';

interface TabInfo {
  value: TabValue;
  label: string;
  empty: string;
}

const ALL_TAB: TabInfo = {
  value: '',
  label: 'All',
  empty: 'Forms you build appear here, drafts and live ones alike.',
};

const TABS: TabInfo[] = [
  ALL_TAB,
  {
    value: 'draft',
    label: 'Draft',
    empty: 'Forms being built, with no public page yet, appear here.',
  },
  {
    value: 'published',
    label: 'Published',
    empty: 'Forms taking applications appear here once an administrator publishes them.',
  },
  {
    value: 'closed',
    label: 'Closed',
    empty: 'Forms that have stopped taking applications appear here.',
  },
  {
    value: 'archived',
    label: 'Archived',
    empty: 'Forms put away from the everyday list appear here, with their applications kept.',
  },
];

const tabOf = (value: string | null): TabValue =>
  TABS.find((tab) => tab.value === value)?.value ?? ALL_TAB.value;

/** The list request for a tab, type, search and page. */
const listParams = (tab: TabValue, type: string, q: string, page: number): FormListParams => ({
  ...(tab === 'archived' ? { archived: true } : {}),
  ...(tab && tab !== 'archived' ? { status: tab } : {}),
  ...(type ? { type: type as FormType } : {}),
  ...(q ? { q } : {}),
  page,
  pageSize: PAGE_SIZE,
});

const scheduleLine = (form: FormListItem): string => {
  if (form.closesAt) return `Closes ${formatInstant(form.closesAt)}`;
  if (form.opensAt) return `Opens ${formatInstant(form.opensAt)}`;
  return 'No closing date';
};

/** "New form": start blank, or from the speaker application template. */
const NewFormButton = (): JSX.Element => {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const go = (path: string) => (): void => {
    setAnchor(null);
    navigate(path);
  };
  return (
    <>
      <Button
        variant="contained"
        startIcon={<AddRoundedIcon />}
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        fullWidth
      >
        New form
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={go('/forms/new')}>
          <ListItemIcon>
            <ArticleOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Blank form" secondary="One empty step to build on." />
        </MenuItem>
        <MenuItem onClick={go('/forms/new?template=speaker-application')}>
          <ListItemIcon>
            <RecordVoiceOverOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Speaker application (template)"
            secondary="Five steps of questions, ready to adjust."
          />
        </MenuItem>
      </Menu>
    </>
  );
};

const FormCard = ({ form }: { form: FormListItem }): JSX.Element => {
  const type = FORM_TYPE_OPTIONS.find((option) => option.value === form.type);
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
      <CardActionArea
        component={RouterLink}
        to={`/forms/${form.id}`}
        sx={{ height: '100%', p: 2.5, display: 'flex', alignItems: 'stretch' }}
      >
        <Stack spacing={1.5} sx={{ width: '100%', minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ flexWrap: 'wrap', rowGap: 1 }}
          >
            <FormStatusChip status={form.status} archived={Boolean(form.archivedAt)} />
            <Typography variant="caption" color="text.secondary">
              {type?.label}
            </Typography>
          </Stack>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component="h2"
              variant="h6"
              sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
            >
              {form.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              /apply/{form.slug}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {form.submissionCount} {form.submissionCount === 1 ? 'application' : 'applications'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {form.fieldCount} {form.fieldCount === 1 ? 'question' : 'questions'}
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {scheduleLine(form)} · version {form.version}
          </Typography>
        </Stack>
      </CardActionArea>
    </Card>
  );
};

const GRID_SX = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(3, minmax(0, 1fr))',
  },
} as const;

/** The card grid's shape while it loads. */
const FormGridSkeleton = (): JSX.Element => (
  <Box sx={GRID_SX} aria-busy="true" aria-label="Loading forms">
    {Array.from({ length: 6 }, (_, index) => (
      <Card key={index} variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" width={84} height={24} />
          <Skeleton variant="text" width="70%" sx={{ fontSize: '1.25rem' }} />
          <Skeleton variant="text" width="45%" />
          <Skeleton variant="text" width="60%" sx={{ mt: 2 }} />
        </Stack>
      </Card>
    ))}
  </Box>
);

/** Loading, failure, nothing yet, or the grid: whichever the list is in. */
const FormsResults = ({
  query,
  tab,
  filtered,
  canCreate,
}: {
  query: ReturnType<typeof useForms>;
  tab: TabInfo;
  filtered: boolean;
  canCreate: boolean;
}): JSX.Element => {
  const navigate = useNavigate();
  if (query.isPending) return <FormGridSkeleton />;
  if (query.isError) {
    return (
      <Alert severity="error" action={<Button onClick={() => void query.refetch()}>Retry</Button>}>
        {query.error.message || 'The forms could not be loaded.'}
      </Alert>
    );
  }
  if (query.data.items.length === 0) {
    const label = tab.value ? `${tab.label.toLowerCase()} ` : '';
    return (
      <EmptyState
        icon={<InboxOutlinedIcon />}
        title={filtered ? 'No forms match' : `No ${label}forms`}
        description={filtered ? 'Try another search or type, or clear the filters.' : tab.empty}
        primaryAction={
          canCreate && !filtered
            ? { label: 'New form', onClick: () => navigate('/forms/new'), icon: <AddRoundedIcon /> }
            : undefined
        }
      />
    );
  }
  return (
    <Box sx={GRID_SX}>
      {query.data.items.map((form) => (
        <FormCard key={form.id} form={form} />
      ))}
    </Box>
  );
};

/**
 * Every form, by status (plan §4.3): drafts being built, published forms
 * taking applications, closed ones, and the archive. Searched and paged by the
 * API, with each form's application count.
 */
const FormsPage = (): JSX.Element => {
  const can = useCan();
  const [params, setParams] = useSearchParams();
  const tab = tabOf(params.get('status'));
  const type = params.get('type') ?? '';
  const page = usePageParam();
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const heading = useRef<HTMLHeadingElement>(null);
  const query = useForms(listParams(tab, type, q, page));
  const canCreate = can('create', 'forms');
  const tabInfo = TABS.find((candidate) => candidate.value === tab) ?? ALL_TAB;

  // Filters live in the address; changing one goes back to the first page.
  const setParam = (key: string, value: string): void =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      return next;
    });
  const changeSearch = (text: string): void => {
    setSearch(text);
    if (page !== 1) setParam('page', '');
  };

  return (
    <>
      <PageHeader
        title="Forms"
        description="Public forms people fill in to apply: speaker calls, volunteering, mentoring, partnerships."
        icon={<DynamicFormIcon />}
        help={pageGuides.forms}
        count={query.data?.total}
        action={canCreate ? <NewFormButton /> : undefined}
      />
      <Tabs
        value={tab}
        onChange={(_event, value: TabValue) => setParam('status', value)}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label="Form status"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map((item) => (
          <Tab key={item.value || 'all'} value={item.value} label={item.label} />
        ))}
      </Tabs>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          mb: 3,
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
        }}
      >
        <TextField
          label="Search forms"
          value={search}
          onChange={(event) => changeSearch(event.target.value)}
          placeholder="Title or address"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon />
                </InputAdornment>
              ),
            },
          }}
        />
        <OptionSelect
          label="Type"
          options={withAnyOption(FORM_TYPE_OPTIONS, 'Every type', 'Forms for any purpose.')}
          value={type}
          onChange={(value) => setParam('type', value)}
          placeholder="Every type"
        />
      </Box>
      <Typography
        ref={heading}
        tabIndex={-1}
        component="h2"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      >
        {tabInfo.label} forms
      </Typography>
      <FormsResults
        query={query}
        tab={tabInfo}
        filtered={Boolean(q || type)}
        canCreate={canCreate}
      />
      <ServerPagination
        totalPages={query.data?.totalPages ?? 1}
        focusRef={heading}
        ariaLabel="Form pages"
      />
    </>
  );
};

export default FormsPage;
