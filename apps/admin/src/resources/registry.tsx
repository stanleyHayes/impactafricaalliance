import {
  CONTENT_STATUSES,
  JOB_TYPES,
  PAGE_KEYS,
  TEAM_TIERS,
  type MediaAsset,
  articleInputSchema,
  galleryItemInputSchema,
  impactStatInputSchema,
  jobInputSchema,
  pageSettingInputSchema,
  partnerInputSchema,
  reportInputSchema,
  storyInputSchema,
  teamMemberInputSchema,
} from '@iaa/shared';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CollectionsIcon from '@mui/icons-material/Collections';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ImageIcon from '@mui/icons-material/Image';
import InsightsIcon from '@mui/icons-material/Insights';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import WorkOutlineIcon from '@mui/icons-material/WorkOutlineOutlined';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import type { GridColDef } from '@mui/x-data-grid';

import { ArticlePreview } from '../components/markdown/ArticlePreview';
import { PageSettingPreview } from '../components/markdown/PageSettingPreview';
import { formatUtcDate } from '../lib/date';

import type { ResourceConfig, SelectOption } from './types';

const toOptions = (values: readonly string[]): SelectOption[] =>
  values.map((value) => ({ value, label: value.replace(/-/g, ' ') }));

const statusColumn: GridColDef = {
  field: 'status',
  headerName: 'Status',
  width: 130,
  renderCell: (params) => (
    <Chip
      size="small"
      label={String(params.value)}
      color={params.value === 'published' ? 'success' : 'default'}
    />
  ),
};

const booleanColumn = (field: string, headerName: string): GridColDef => ({
  field,
  headerName,
  width: 110,
  renderCell: (params) => (
    <Chip
      size="small"
      label={params.value ? 'Yes' : 'No'}
      color={params.value ? 'success' : 'default'}
    />
  ),
});

/** A compact image thumbnail cell rendered from a MediaAsset value. */
const mediaColumn = (
  field: string,
  opts?: { circle?: boolean; fit?: 'cover' | 'contain' },
): GridColDef => ({
  field,
  headerName: '',
  width: 64,
  sortable: false,
  filterable: false,
  renderCell: (params) => {
    const url = (params.value as MediaAsset | undefined)?.url;
    const radius = opts?.circle ? '50%' : 1.5;
    if (!url) {
      return <Box sx={{ width: 40, height: 40, borderRadius: radius, bgcolor: 'action.hover' }} />;
    }
    return (
      <Box
        component="img"
        src={url}
        alt=""
        loading="lazy"
        sx={{
          width: 40,
          height: 40,
          borderRadius: radius,
          objectFit: opts?.fit ?? 'cover',
          bgcolor: 'background.default',
          border: '1px solid',
          borderColor: 'divider',
        }}
      />
    );
  },
});

const dateColumn = (field: string, headerName: string): GridColDef => ({
  field,
  headerName,
  width: 130,
  renderCell: (params) =>
    params.value ? formatUtcDate(String(params.value)) : '—',
});

const tagsColumn: GridColDef = {
  field: 'tags',
  headerName: 'Tags',
  width: 220,
  sortable: false,
  renderCell: (params) =>
    Array.isArray(params.value) && params.value.length > 0 ? (
      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
        {(params.value as string[]).slice(0, 3).map((tag) => (
          <Chip key={tag} size="small" label={tag} sx={{ height: 20 }} />
        ))}
      </Stack>
    ) : (
      '—'
    ),
};

export const RESOURCES: readonly ResourceConfig[] = [
  {
    key: 'articles',
    label: 'News & Blog',
    singular: 'Article',
    description: 'Publish and manage newsroom stories and blog posts.',
    icon: <NewspaperIcon />,
    emptyTitle: 'No articles yet',
    emptyDescription:
      'Your published stories and drafts will live here. Write your first article to start building the Impact Africa Alliance newsroom.',
    createSchema: articleInputSchema,
    renderPreview: (values) => <ArticlePreview values={values} />,
    defaultValues: { status: 'draft', tags: [], title: '', slug: '', excerpt: '', body: '', autoPostToSocial: false },
    fields: [
      { name: 'title', label: 'Title', type: 'text', wide: true },
      { name: 'slug', label: 'Slug', type: 'slug' },
      { name: 'status', label: 'Status', type: 'select', options: toOptions(CONTENT_STATUSES) },
      { name: 'excerpt', label: 'Excerpt', type: 'textarea', wide: true },
      { name: 'body', label: 'Body', type: 'richtext', wide: true },
      { name: 'tags', label: 'Tags (comma separated)', type: 'tags', wide: true },
      { name: 'coverImage', label: 'Cover image', type: 'image', wide: true },
      { name: 'autoPostToSocial', label: 'Auto-post to social media on publish', type: 'switch', wide: true },
    ],
    columns: [
      mediaColumn('coverImage'),
      { field: 'title', headerName: 'Title', flex: 1, minWidth: 240 },
      statusColumn,
      tagsColumn,
      dateColumn('publishedAt', 'Published'),
      dateColumn('updatedAt', 'Updated'),
    ],
  },
  {
    key: 'stories',
    label: 'Impact Stories',
    singular: 'Story',
    icon: <AutoStoriesIcon />,
    createSchema: storyInputSchema,
    defaultValues: { status: 'draft', featured: false, order: 0 },
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'slug', label: 'Slug', type: 'slug' },
      { name: 'country', label: 'Country', type: 'text' },
      { name: 'program', label: 'Program', type: 'text' },
      { name: 'quote', label: 'Quote', type: 'textarea', wide: true },
      { name: 'narrative', label: 'Narrative', type: 'richtext', wide: true },
      { name: 'photo', label: 'Photo', type: 'image', wide: true },
      { name: 'status', label: 'Status', type: 'select', options: toOptions(CONTENT_STATUSES) },
      { name: 'featured', label: 'Featured', type: 'switch' },
      { name: 'order', label: 'Order', type: 'number' },
    ],
    columns: [
      mediaColumn('photo'),
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
      { field: 'country', headerName: 'Country', width: 140 },
      { field: 'program', headerName: 'Program', flex: 1, minWidth: 160 },
      statusColumn,
    ],
  },
  {
    key: 'team',
    label: 'Team',
    singular: 'Team member',
    icon: <Diversity3Icon />,
    createSchema: teamMemberInputSchema,
    defaultValues: { tier: 'leadership', isActive: true, order: 0 },
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'role', label: 'Role', type: 'text' },
      { name: 'tier', label: 'Tier', type: 'select', options: toOptions(TEAM_TIERS) },
      { name: 'bio', label: 'Bio', type: 'textarea', wide: true },
      { name: 'photo', label: 'Photo', type: 'image', wide: true },
      { name: 'linkedInUrl', label: 'LinkedIn URL', type: 'text', wide: true },
      { name: 'order', label: 'Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'switch' },
    ],
    columns: [
      mediaColumn('photo', { circle: true }),
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
      { field: 'role', headerName: 'Role', flex: 1, minWidth: 160 },
      { field: 'tier', headerName: 'Tier', width: 140 },
      booleanColumn('isActive', 'Active'),
    ],
  },
  {
    key: 'partners',
    label: 'Partners',
    singular: 'Partner',
    icon: <HandshakeIcon />,
    createSchema: partnerInputSchema,
    defaultValues: { isActive: true, order: 0 },
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'logo', label: 'Logo', type: 'image', wide: true },
      { name: 'websiteUrl', label: 'Website URL', type: 'text', wide: true },
      { name: 'order', label: 'Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'switch' },
    ],
    columns: [
      mediaColumn('logo', { fit: 'contain' }),
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
      { field: 'order', headerName: 'Order', width: 100 },
      booleanColumn('isActive', 'Active'),
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    singular: 'Report',
    icon: <AssessmentIcon />,
    createSchema: reportInputSchema,
    defaultValues: { status: 'draft', order: 0, year: new Date().getFullYear() },
    fields: [
      { name: 'title', label: 'Title', type: 'text', wide: true },
      { name: 'description', label: 'Description', type: 'textarea', wide: true },
      { name: 'year', label: 'Year', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: toOptions(CONTENT_STATUSES) },
      { name: 'file', label: 'PDF file', type: 'file', wide: true },
      { name: 'order', label: 'Order', type: 'number' },
    ],
    columns: [
      { field: 'title', headerName: 'Title', flex: 1, minWidth: 220 },
      { field: 'year', headerName: 'Year', width: 100 },
      statusColumn,
    ],
  },
  {
    key: 'jobs',
    label: 'Careers',
    singular: 'Job',
    icon: <WorkOutlineIcon />,
    createSchema: jobInputSchema,
    defaultValues: { status: 'draft', type: 'full-time' },
    fields: [
      { name: 'title', label: 'Title', type: 'text', wide: true },
      { name: 'slug', label: 'Slug', type: 'slug' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'type', label: 'Type', type: 'select', options: toOptions(JOB_TYPES) },
      { name: 'description', label: 'Description', type: 'richtext', wide: true },
      { name: 'applyUrl', label: 'Apply URL', type: 'text', wide: true },
      { name: 'deadline', label: 'Deadline', type: 'datetime' },
      { name: 'status', label: 'Status', type: 'select', options: toOptions(CONTENT_STATUSES) },
    ],
    columns: [
      { field: 'title', headerName: 'Title', flex: 1, minWidth: 220 },
      { field: 'location', headerName: 'Location', width: 160 },
      { field: 'type', headerName: 'Type', width: 130 },
      statusColumn,
    ],
  },
  {
    key: 'gallery',
    label: 'Programme Gallery',
    singular: 'Gallery photo',
    icon: <CollectionsIcon />,
    description:
      'Photography from recent programmes and events, shown in the Impact Programme snapshot.',
    emptyTitle: 'No programme photos yet',
    emptyDescription:
      'Upload shots from your most recent programme or festival. Published photos appear in the Impact Programme snapshot on the public site.',
    createSchema: galleryItemInputSchema,
    defaultValues: { status: 'draft', featured: false, order: 0, programme: '' },
    fields: [
      { name: 'image', label: 'Photo', type: 'image', wide: true },
      { name: 'title', label: 'Title', type: 'text', wide: true },
      {
        name: 'programme',
        label: 'Programme / event',
        type: 'text',
        helperText: 'Groups the photo on the public site, e.g. "Accra Impact Festival".',
      },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'caption', label: 'Caption', type: 'textarea', wide: true },
      { name: 'capturedOn', label: 'Date taken', type: 'datetime' },
      { name: 'status', label: 'Status', type: 'select', options: toOptions(CONTENT_STATUSES) },
      { name: 'featured', label: 'Feature (shown large)', type: 'switch' },
      { name: 'order', label: 'Order', type: 'number' },
    ],
    columns: [
      mediaColumn('image'),
      { field: 'title', headerName: 'Title', flex: 1, minWidth: 200 },
      { field: 'programme', headerName: 'Programme', flex: 1, minWidth: 180 },
      dateColumn('capturedOn', 'Taken'),
      statusColumn,
      booleanColumn('featured', 'Featured'),
    ],
  },
  {
    key: 'stats',
    label: 'Impact Stats',
    singular: 'Impact stat',
    icon: <InsightsIcon />,
    createSchema: impactStatInputSchema,
    defaultValues: { suffix: '', order: 0, isActive: true },
    fields: [
      { name: 'key', label: 'Key', type: 'slug' },
      { name: 'label', label: 'Label', type: 'text', wide: true },
      { name: 'value', label: 'Value', type: 'number' },
      { name: 'suffix', label: 'Suffix', type: 'text' },
      { name: 'order', label: 'Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'switch' },
    ],
    columns: [
      { field: 'label', headerName: 'Label', flex: 1, minWidth: 200 },
      { field: 'value', headerName: 'Value', width: 120 },
      { field: 'order', headerName: 'Order', width: 100 },
      booleanColumn('isActive', 'Active'),
    ],
  },
  {
    key: 'page-settings',
    label: 'Page Settings',
    singular: 'Page setting',
    icon: <ImageIcon />,
    description: 'Manage SEO, hero, introduction, call-to-action copy, and imagery for static pages.',
    emptyTitle: 'No page settings yet',
    emptyDescription: 'Add a page record to manage its public copy, search metadata, calls to action, and hero image.',
    createSchema: pageSettingInputSchema,
    renderPreview: (values) => <PageSettingPreview values={values} />,
    defaultValues: { pageKey: PAGE_KEYS[0], status: 'draft' },
    fields: [
      {
        name: 'pageKey',
        label: 'Page',
        type: 'select',
        options: PAGE_KEYS.map((key) => ({ value: key, label: key.replace(/-/g, ' ') })),
        wide: true,
      },
      { name: 'seoTitle', label: 'SEO title', type: 'text', wide: true, helperText: 'Keep this under 60 characters where possible.' },
      { name: 'seoDescription', label: 'SEO description', type: 'textarea', wide: true, helperText: 'Aim for 150–160 characters.' },
      { name: 'heroEyebrow', label: 'Hero eyebrow', type: 'text' },
      { name: 'heroTitle', label: 'Hero title', type: 'text', wide: true },
      { name: 'heroSubtitle', label: 'Hero subtitle', type: 'textarea', wide: true },
      { name: 'heroImage', label: 'Hero image', type: 'image', wide: true },
      { name: 'introEyebrow', label: 'Introduction eyebrow', type: 'text' },
      { name: 'introTitle', label: 'Introduction title', type: 'text', wide: true },
      { name: 'introBody', label: 'Introduction body', type: 'richtext', wide: true },
      { name: 'ctaTitle', label: 'Call to action title', type: 'text', wide: true },
      { name: 'ctaBody', label: 'Call to action body', type: 'textarea', wide: true },
      { name: 'ctaLabel', label: 'Call to action button', type: 'text' },
      { name: 'ctaUrl', label: 'Call to action URL', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: toOptions(CONTENT_STATUSES) },
    ],
    columns: [
      { field: 'pageKey', headerName: 'Page', flex: 1, minWidth: 180 },
      statusColumn,
      mediaColumn('heroImage'),
      dateColumn('updatedAt', 'Updated'),
    ],
  },
];

export const findResource = (key: string): ResourceConfig | undefined =>
  RESOURCES.find((resource) => resource.key === key);
