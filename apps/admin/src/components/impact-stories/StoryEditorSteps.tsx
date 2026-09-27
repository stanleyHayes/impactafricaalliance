import { STORY_BLOCK_LABELS } from '@iaa/shared';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { PROGRAMME_OPTIONS, withAnyOption } from '../../lib/select-options';
import { slugify } from '../../lib/slug';
import { OptionSelect } from '../fields/OptionSelect';
import { TagsField } from '../fields/TagsField';

import { ImageWithAltField } from './blocks/fields';
import { ProjectPicker } from './ProjectPicker';
import {
  SEO_DESCRIPTION_LIMIT,
  SEO_TITLE_LIMIT,
  type StoryFieldErrors,
  type StoryFormState,
} from './story-form';

export interface StoryStepProps {
  form: StoryFormState;
  update: (patch: Partial<StoryFormState>) => void;
  /** Field problems, shown once the reader has tried to leave the step. */
  errors: StoryFieldErrors;
  disabled: boolean;
  onUploadingChange: (uploading: boolean) => void;
}

const EXCERPT_LIMIT = 400;

/** Title, web address, excerpt and cover. */
export const StoryBasicsStep = ({
  form,
  update,
  errors,
  disabled,
  onUploadingChange,
}: StoryStepProps): JSX.Element => (
  <Stack spacing={3}>
    <TextField
      label="Title"
      required
      value={form.title}
      onChange={(event) => {
        const title = event.target.value;
        update(form.slugTouched ? { title } : { title, slug: slugify(title) });
      }}
      error={Boolean(errors.title)}
      helperText={errors.title ?? 'The headline on the website, 3 to 180 characters.'}
      disabled={disabled}
      fullWidth
      slotProps={{ htmlInput: { maxLength: 180 } }}
    />
    <TextField
      label="Web address"
      required
      value={form.slug}
      onChange={(event) => update({ slug: event.target.value, slugTouched: true })}
      error={Boolean(errors.slug)}
      helperText={
        errors.slug ??
        (form.slugTouched
          ? 'Lowercase words joined by hyphens. Changing it breaks links already shared.'
          : 'Made from the title until you change it.')
      }
      disabled={disabled}
      fullWidth
      slotProps={{
        input: {
          startAdornment: <InputAdornment position="start">/impact/stories/</InputAdornment>,
        },
        htmlInput: { maxLength: 120 },
      }}
    />
    <TextField
      label="Excerpt"
      required
      multiline
      minRows={3}
      value={form.excerpt}
      onChange={(event) => update({ excerpt: event.target.value })}
      error={Boolean(errors.excerpt)}
      helperText={
        errors.excerpt ??
        `${form.excerpt.trim().length}/${EXCERPT_LIMIT} · Shown on the story list and in link previews.`
      }
      disabled={disabled}
      fullWidth
      slotProps={{ htmlInput: { maxLength: EXCERPT_LIMIT } }}
    />
    <ImageWithAltField
      label="Cover image"
      value={form.cover}
      onChange={(cover) => update({ cover: cover ?? null })}
      error={errors.cover}
      onUploadingChange={onUploadingChange}
      disabled={disabled}
    />
  </Stack>
);

const PROGRAMME_CHOICES = withAnyOption(
  PROGRAMME_OPTIONS,
  'No programme',
  'The story is not filed under one programme area.',
);

/** Project, programme, country and tags: what the website filters and groups by. */
export const StoryClassificationStep = ({
  form,
  update,
  errors,
  disabled,
}: StoryStepProps): JSX.Element => (
  <Stack spacing={3}>
    <ProjectPicker
      value={form.project}
      onChange={(project) => update({ project, projectId: project?.id ?? null })}
      disabled={disabled}
    />
    <OptionSelect
      label="Programme"
      options={PROGRAMME_CHOICES}
      value={form.programme}
      onChange={(programme) => update({ programme })}
      error={errors.programme}
      helperText="Visitors can filter stories by programme once stories carry one."
      disabled={disabled}
    />
    <TextField
      label="Country"
      value={form.country}
      onChange={(event) => update({ country: event.target.value })}
      error={Boolean(errors.country)}
      helperText={errors.country ?? 'Such as Ghana. Visitors can filter stories by country.'}
      disabled={disabled}
      fullWidth
      slotProps={{ htmlInput: { maxLength: 80 } }}
    />
    <TagsField
      label="Tags"
      value={form.tags}
      onChange={(tags) => update({ tags })}
      error={errors.tags}
      helperText="Up to 12 short topics. Type a tag, then press Enter or comma."
    />
  </Stack>
);

const counter = (length: number, limit: number): string => `${length}/${limit}`;

/** What search engines and link previews show, when it should differ from the story. */
export const StorySearchStep = ({
  form,
  update,
  errors,
  disabled,
  onUploadingChange,
}: StoryStepProps): JSX.Element => {
  const titleLength = form.seoTitle.trim().length;
  const descriptionLength = form.seoDescription.trim().length;
  const shownTitle = form.seoTitle.trim() || form.title || 'Story title';
  const shownDescription = form.seoDescription.trim() || form.excerpt || 'Story excerpt';
  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary">
        Optional. Leave these empty and search engines and link previews use the title, excerpt and
        cover.
      </Typography>
      <TextField
        label="Search title"
        value={form.seoTitle}
        onChange={(event) => update({ seoTitle: event.target.value })}
        error={titleLength > SEO_TITLE_LIMIT || Boolean(errors.seo)}
        helperText={`${counter(titleLength, SEO_TITLE_LIMIT)} · Search engines cut titles longer than ${SEO_TITLE_LIMIT} characters.`}
        disabled={disabled}
        fullWidth
      />
      <TextField
        label="Search description"
        multiline
        minRows={2}
        value={form.seoDescription}
        onChange={(event) => update({ seoDescription: event.target.value })}
        error={descriptionLength > SEO_DESCRIPTION_LIMIT || Boolean(errors.seo)}
        helperText={`${counter(descriptionLength, SEO_DESCRIPTION_LIMIT)} · Shown under the title in search results.`}
        disabled={disabled}
        fullWidth
      />
      {errors.seo && (
        <Typography variant="body2" color="error">
          {errors.seo}
        </Typography>
      )}
      <ImageWithAltField
        label="Share image"
        value={form.seoImage}
        onChange={(seoImage) => update({ seoImage: seoImage ?? null })}
        onUploadingChange={onUploadingChange}
        disabled={disabled}
      />
      <Box
        aria-label="Search result preview"
        role="figure"
        sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2, maxWidth: 600 }}
      >
        <Typography variant="caption" color="text.secondary">
          impactafricaalliance.org › impact › stories › {form.slug || 'story'}
        </Typography>
        <Typography sx={{ color: 'primary.dark', fontWeight: 600, overflowWrap: 'anywhere' }}>
          {shownTitle.slice(0, SEO_TITLE_LIMIT)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
          {shownDescription.slice(0, SEO_DESCRIPTION_LIMIT)}
        </Typography>
      </Box>
    </Stack>
  );
};

const ReviewRow = ({ label, children }: { label: string; children: ReactNode }): JSX.Element => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: '160px minmax(0, 1fr)' },
      gap: { xs: 0.25, sm: 2 },
      py: 1,
    }}
  >
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
      {label}
    </Typography>
    <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>{children}</Box>
  </Box>
);

const ReviewSection = ({
  title,
  onEdit,
  disabled,
  children,
}: {
  title: string;
  onEdit: () => void;
  disabled: boolean;
  children: ReactNode;
}): JSX.Element => (
  <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: { xs: 1.5, sm: 2 } }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Button size="small" onClick={onEdit} disabled={disabled}>
        Edit {title.toLowerCase()}
      </Button>
    </Stack>
    {children}
  </Box>
);

const dash = (value: string | undefined | null): string => (value?.trim() ? value : '—');

/** Everything on one screen before saving, with a link back to each step. */
export const StoryReviewSummary = ({
  form,
  goTo,
  disabled,
}: {
  form: StoryFormState;
  goTo: (step: number) => void;
  disabled: boolean;
}): JSX.Element => {
  const programme = PROGRAMME_OPTIONS.find((option) => option.value === form.programme)?.label;
  return (
    <Stack spacing={2}>
      <ReviewSection title="Basics" onEdit={() => goTo(0)} disabled={disabled}>
        <ReviewRow label="Title">{dash(form.title)}</ReviewRow>
        <ReviewRow label="Web address">/impact/stories/{form.slug}</ReviewRow>
        <ReviewRow label="Excerpt">{dash(form.excerpt)}</ReviewRow>
        <ReviewRow label="Cover">
          {form.cover ? (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                component="img"
                src={form.cover.url}
                alt=""
                sx={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 1 }}
              />
              <Typography variant="body2">{form.cover.alt?.trim() || 'No alt text yet'}</Typography>
            </Stack>
          ) : (
            '—'
          )}
        </ReviewRow>
      </ReviewSection>
      <ReviewSection title="Classification" onEdit={() => goTo(1)} disabled={disabled}>
        <ReviewRow label="Project">{dash(form.project?.title)}</ReviewRow>
        <ReviewRow label="Programme">{dash(programme)}</ReviewRow>
        <ReviewRow label="Country">{dash(form.country)}</ReviewRow>
        <ReviewRow label="Tags">{form.tags.length > 0 ? form.tags.join(', ') : '—'}</ReviewRow>
      </ReviewSection>
      <ReviewSection title="Blocks" onEdit={() => goTo(2)} disabled={disabled}>
        {form.blocks.length === 0 ? (
          <Typography variant="body2" sx={{ py: 1 }}>
            No blocks yet.
          </Typography>
        ) : (
          <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.75} sx={{ py: 1 }}>
            {form.blocks.map((block, index) => (
              <Chip
                key={block.id}
                size="small"
                label={`${index + 1}. ${STORY_BLOCK_LABELS[block.type]}`}
              />
            ))}
          </Stack>
        )}
      </ReviewSection>
      <ReviewSection title="Search & sharing" onEdit={() => goTo(3)} disabled={disabled}>
        <ReviewRow label="Search title">{form.seoTitle.trim() || 'Uses the title'}</ReviewRow>
        <ReviewRow label="Search description">
          {form.seoDescription.trim() ? form.seoDescription : 'Uses the excerpt'}
        </ReviewRow>
        <ReviewRow label="Share image">{form.seoImage ? 'Set' : 'Uses the cover'}</ReviewRow>
      </ReviewSection>
    </Stack>
  );
};

/** What still stands between this story and the website, as the API will judge it. */
export const PublishChecklist = ({ problems }: { problems: string[] }): JSX.Element => (
  <Box
    sx={{
      p: { xs: 1.5, sm: 2 },
      border: 1,
      borderRadius: 2,
      borderColor: problems.length > 0 ? 'warning.main' : 'success.main',
    }}
  >
    <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
      Ready to publish?
    </Typography>
    {problems.length === 0 ? (
      <Stack direction="row" spacing={1} alignItems="center">
        <CheckCircleRoundedIcon color="success" fontSize="small" aria-hidden />
        <Typography variant="body2">
          Everything publishing needs is in place. An administrator can publish it.
        </Typography>
      </Stack>
    ) : (
      <Stack component="ul" spacing={0.75} sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {problems.map((problem) => (
          <Stack component="li" key={problem} direction="row" spacing={1} alignItems="flex-start">
            <ErrorOutlineRoundedIcon
              color="warning"
              fontSize="small"
              sx={{ mt: 0.2 }}
              aria-hidden
            />
            <Typography variant="body2">{problem}</Typography>
          </Stack>
        ))}
      </Stack>
    )}
  </Box>
);
