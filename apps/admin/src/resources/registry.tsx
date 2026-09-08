import {
  CONTENT_STATUSES,
  JOB_TYPES,
  PAGE_KEYS,
  type MediaAsset,
  articleInputSchema,
  galleryItemInputSchema,
  impactStatInputSchema,
  jobInputSchema,
  pageSettingInputSchema,
  PILLARS,
  announcementInputSchema,
  BANNER_TONES,
  sitePopupInputSchema,
  SITE_IMAGE_SLOTS,
  siteImageSlot,
  siteImageInputSchema,
  TEAM_TIERS,
  officeInputSchema,
  pillarImageInputSchema,
  partnerInputSchema,
  reportInputSchema,
  storyInputSchema,
  teamMemberInputSchema,
} from '@iaa/shared';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CampaignIcon from '@mui/icons-material/Campaign';
import CollectionsIcon from '@mui/icons-material/Collections';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ImageIcon from '@mui/icons-material/Image';
import InsightsIcon from '@mui/icons-material/Insights';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import PlaceIcon from '@mui/icons-material/Place';
import WebAssetIcon from '@mui/icons-material/WebAsset';
import WorkOutlineIcon from '@mui/icons-material/WorkOutlineOutlined';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import type { GridColDef } from '@mui/x-data-grid';

import { ArticlePreview } from '../components/markdown/ArticlePreview';
import { PageSettingPreview } from '../components/markdown/PageSettingPreview';
import { ImageSlotPreview } from '../components/media/ImageSlotPreview';
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
  // Leave room for the thumbnail and the table's 16px padding on each side.
  width: 80,
  minWidth: 80,
  resizable: false,
  align: 'center',
  sortable: false,
  filterable: false,
  renderCell: (params) => {
    const url = (params.value as MediaAsset | undefined)?.url;
    const radius = opts?.circle ? '50%' : 1.5;
    const initials = String(params.row.name ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((name) => name.charAt(0))
      .join('')
      .toUpperCase();
    return (
      <Avatar
        src={url}
        alt=""
        aria-hidden="true"
        slotProps={{ img: { loading: 'lazy', sx: { objectFit: opts?.fit ?? 'cover' } } }}
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: radius,
          bgcolor: 'action.hover',
          color: 'text.secondary',
          fontSize: 14,
          fontWeight: 700,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {opts?.circle && initials ? initials : <ImageIcon fontSize="small" />}
      </Avatar>
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
    defaultValues: { tier: 'executive', isActive: true, order: 0 },
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'role', label: 'Role', type: 'text' },
      { name: 'tier', label: 'Group', type: 'select', options: toOptions(TEAM_TIERS) },
      { name: 'bio', label: 'Bio', type: 'textarea', wide: true },
      { name: 'photo', label: 'Photo', type: 'image', wide: true },
      // Every profile link is optional — blanks are dropped, and the public
      // card only renders an icon for the ones actually filled in.
      { name: 'websiteUrl', label: 'Personal website (optional)', type: 'text', wide: true },
      { name: 'linkedInUrl', label: 'LinkedIn URL (optional)', type: 'text', wide: true },
      { name: 'githubUrl', label: 'GitHub URL (optional)', type: 'text', wide: true },
      { name: 'xUrl', label: 'X URL (optional)', type: 'text', wide: true },
      { name: 'instagramUrl', label: 'Instagram URL (optional)', type: 'text', wide: true },
      { name: 'facebookUrl', label: 'Facebook URL (optional)', type: 'text', wide: true },
      { name: 'tiktokUrl', label: 'TikTok URL (optional)', type: 'text', wide: true },
      { name: 'order', label: 'Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'switch' },
    ],
    columns: [
      mediaColumn('photo', { circle: true }),
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
      { field: 'role', headerName: 'Role', flex: 1, minWidth: 160 },
      { field: 'tier', headerName: 'Group', width: 150 },
      booleanColumn('isActive', 'Active'),
    ],
  },
  {
    key: 'announcements',
    label: 'Banners',
    singular: 'Banner',
    icon: <CampaignIcon />,
    createSchema: announcementInputSchema,
    // Off by default: a banner is usually written before it is wanted, and one
    // appearing the moment it is saved is the wrong kind of surprise.
    defaultValues: { isActive: false, priority: 0, tone: 'announcement' },
    fields: [
      { name: 'name', label: 'Name (for this list only)', type: 'text', wide: true },
      { name: 'message', label: 'Message shown to visitors', type: 'textarea', wide: true },
      { name: 'linkUrl', label: 'Link URL (optional)', type: 'text', wide: true },
      { name: 'linkLabel', label: 'Link label (optional)', type: 'text' },
      { name: 'tone', label: 'Tone', type: 'select', options: toOptions(BANNER_TONES) },
      { name: 'startsAt', label: 'Starts (optional)', type: 'datetime' },
      { name: 'endsAt', label: 'Ends (optional)', type: 'datetime' },
      { name: 'priority', label: 'Priority (higher wins)', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'switch' },
    ],
    columns: [
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
      { field: 'message', headerName: 'Message', flex: 2, minWidth: 220 },
      { field: 'startsAt', headerName: 'Starts', width: 150 },
      { field: 'endsAt', headerName: 'Ends', width: 150 },
      { field: 'priority', headerName: 'Priority', width: 100 },
      booleanColumn('isActive', 'Active'),
    ],
  },
  {
    key: 'popups',
    label: 'Popups',
    singular: 'Popup',
    icon: <WebAssetIcon />,
    createSchema: sitePopupInputSchema,
    defaultValues: { isActive: false, priority: 0, delaySeconds: 3 },
    fields: [
      { name: 'name', label: 'Name (for this list only)', type: 'text', wide: true },
      { name: 'title', label: 'Heading', type: 'text', wide: true },
      { name: 'message', label: 'Message', type: 'textarea', wide: true },
      { name: 'ctaLabel', label: 'Button label (optional)', type: 'text' },
      { name: 'ctaUrl', label: 'Button URL (optional)', type: 'text', wide: true },
      { name: 'imageUrl', label: 'Image URL (optional)', type: 'text', wide: true },
      { name: 'delaySeconds', label: 'Seconds before showing', type: 'number' },
      { name: 'startsAt', label: 'Starts (optional)', type: 'datetime' },
      { name: 'endsAt', label: 'Ends (optional)', type: 'datetime' },
      { name: 'priority', label: 'Priority (higher wins)', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'switch' },
    ],
    columns: [
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
      { field: 'title', headerName: 'Heading', flex: 1, minWidth: 180 },
      { field: 'startsAt', headerName: 'Starts', width: 150 },
      { field: 'endsAt', headerName: 'Ends', width: 150 },
      booleanColumn('isActive', 'Active'),
    ],
  },
  {
    key: 'offices',
    label: 'Offices',
    singular: 'Office',
    icon: <PlaceIcon />,
    createSchema: officeInputSchema,
    defaultValues: { isActive: true, isPrimary: false, order: 0 },
    fields: [
      { name: 'label', label: 'Label', type: 'text' },
      { name: 'addressLine1', label: 'Address line 1', type: 'text', wide: true },
      { name: 'addressLine2', label: 'Address line 2', type: 'text', wide: true },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'region', label: 'Region / state', type: 'text' },
      { name: 'postalCode', label: 'Postal code', type: 'text' },
      { name: 'country', label: 'Country', type: 'text' },
      { name: 'phone', label: 'Phone (optional)', type: 'text' },
      { name: 'email', label: 'Email (optional)', type: 'text' },
      { name: 'mapUrl', label: 'Map URL (optional)', type: 'text', wide: true },
      { name: 'isPrimary', label: 'Primary (shown in footer)', type: 'switch' },
      { name: 'order', label: 'Order', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'switch' },
    ],
    columns: [
      { field: 'label', headerName: 'Label', flex: 1, minWidth: 150 },
      { field: 'addressLine1', headerName: 'Address', flex: 1, minWidth: 200 },
      { field: 'country', headerName: 'Country', width: 130 },
      booleanColumn('isPrimary', 'Primary'),
      booleanColumn('isActive', 'Active'),
    ],
  },
  {
    key: 'pillar-images',
    label: 'Pillar Images',
    singular: 'Pillar image',
    icon: <ImageIcon />,
    createSchema: pillarImageInputSchema,
    defaultValues: { isActive: true },
    fields: [
      {
        name: 'pillarKey',
        label: 'Pillar',
        type: 'select',
        options: PILLARS.map((pillar) => ({ value: pillar.key, label: pillar.title })),
      },
      { name: 'image', label: 'Image', type: 'image', wide: true },
      {
        name: 'alt',
        label: 'Alt text (optional)',
        type: 'text',
        wide: true,
        helperText: 'Describes the photo for screen readers. Defaults to the pillar title.',
      },
      { name: 'isActive', label: 'Active', type: 'switch' },
    ],
    columns: [
      mediaColumn('image', { fit: 'cover' }),
      { field: 'pillarKey', headerName: 'Pillar', flex: 1, minWidth: 200 },
      booleanColumn('isActive', 'Active'),
    ],
    renderPreview: (values) => {
      const pillar = PILLARS.find((entry) => entry.key === values.pillarKey);
      return (
        <ImageSlotPreview
          title={pillar?.title ?? 'Pillar image'}
          usage={
            pillar
              ? `The photograph on the ${pillar.title} card, and at the top of its page.`
              : 'Choose a pillar to see where this photograph appears.'
          }
          aspect="16 / 10"
          image={values.image as MediaAsset | undefined}
          {...(pillar ? { previewPath: pillar.path } : {})}
          isActive={values.isActive !== false}
        />
      );
    },
  },
  {
    key: 'site-images',
    label: 'Site Images',
    singular: 'Site image',
    description: 'Banners and artwork the site uses in fixed places.',
    icon: <ImageIcon />,
    createSchema: siteImageInputSchema,
    defaultValues: { isActive: true },
    fields: [
      {
        name: 'key',
        label: 'Where it appears',
        type: 'select',
        options: SITE_IMAGE_SLOTS.map((slot) => ({ value: slot.key, label: slot.label })),
      },
      { name: 'image', label: 'Image', type: 'image', wide: true },
      {
        name: 'alt',
        label: 'Alt text (optional)',
        type: 'text',
        wide: true,
        helperText: 'Describes the photo for screen readers.',
      },
      { name: 'isActive', label: 'Active', type: 'switch' },
    ],
    columns: [
      mediaColumn('image', { fit: 'cover' }),
      {
        field: 'key',
        headerName: 'Where it appears',
        flex: 1,
        minWidth: 220,
        valueFormatter: (value) => siteImageSlot(String(value))?.label ?? String(value),
      },
      booleanColumn('isActive', 'Active'),
    ],
    renderPreview: (values) => {
      const slot = siteImageSlot(String(values.key ?? ''));
      return (
        <ImageSlotPreview
          title={slot?.label ?? 'Site image'}
          usage={slot?.usage ?? 'Choose a slot to see where this photograph appears.'}
          aspect={slot?.aspect ?? '16 / 9'}
          image={values.image as MediaAsset | undefined}
          {...(slot?.fallback ? { fallback: slot.fallback } : {})}
          {...(slot?.previewPath ? { previewPath: slot.previewPath } : {})}
          isActive={values.isActive !== false}
        />
      );
    },
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
      { name: 'bodyContent', label: 'Page body', type: 'richtext', wide: true, helperText: 'Markdown. On Privacy Policy, Cookie Policy, and Terms of Use this replaces the entire default page body when set.' },
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
