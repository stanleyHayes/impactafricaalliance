import {
  CONTENT_STATUSES,
  JOB_TYPES,
  TEAM_TIERS,
  articleInputSchema,
  impactStatInputSchema,
  jobInputSchema,
  partnerInputSchema,
  reportInputSchema,
  storyInputSchema,
  teamMemberInputSchema,
} from '@iaa/shared';
import Chip from '@mui/material/Chip';
import type { GridColDef } from '@mui/x-data-grid';

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

export const RESOURCES: readonly ResourceConfig[] = [
  {
    key: 'articles',
    label: 'News & Blog',
    singular: 'Article',
    createSchema: articleInputSchema,
    defaultValues: { status: 'draft', tags: [], title: '', slug: '', excerpt: '', body: '' },
    fields: [
      { name: 'title', label: 'Title', type: 'text', wide: true },
      { name: 'slug', label: 'Slug', type: 'slug' },
      { name: 'status', label: 'Status', type: 'select', options: toOptions(CONTENT_STATUSES) },
      { name: 'excerpt', label: 'Excerpt', type: 'textarea', wide: true },
      { name: 'body', label: 'Body', type: 'richtext', wide: true },
      { name: 'tags', label: 'Tags (comma separated)', type: 'tags', wide: true },
      { name: 'coverImage', label: 'Cover image', type: 'image', wide: true },
    ],
    columns: [
      { field: 'title', headerName: 'Title', flex: 1, minWidth: 220 },
      { field: 'slug', headerName: 'Slug', flex: 1, minWidth: 160 },
      statusColumn,
    ],
  },
  {
    key: 'stories',
    label: 'Impact Stories',
    singular: 'Story',
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
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
      { field: 'order', headerName: 'Order', width: 100 },
      booleanColumn('isActive', 'Active'),
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    singular: 'Report',
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
    key: 'stats',
    label: 'Impact Stats',
    singular: 'Impact stat',
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
];

export const findResource = (key: string): ResourceConfig | undefined =>
  RESOURCES.find((resource) => resource.key === key);
