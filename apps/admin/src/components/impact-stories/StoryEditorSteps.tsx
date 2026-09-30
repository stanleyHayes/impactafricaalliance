import { STORY_BLOCK_LABELS } from '@iaa/shared';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { PROGRAMME_OPTIONS, withAnyOption } from '../../lib/select-options';
import { slugify } from '../../lib/slug';
import { skinned, surfaceSx, tokenVar } from '../../theme/surfaces';
import { OptionSelect } from '../fields/OptionSelect';
import { TagsField } from '../fields/TagsField';
import { ReviewSummary } from '../forms/ReviewSummary';

import { ImageWithAltField } from './blocks/fields';
import { ProjectPicker } from './ProjectPicker';
import {
  SEO_DESCRIPTION_LIMIT,
  SEO_TITLE_LIMIT,
  STORY_FORM_STEPS,
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

/**
 * The search result preview's frame. Classic outlines it on the card; the
 * other skins sink it into the card as a well, set apart from the fields.
 */
const PREVIEW_WELL_SX = skinned({ border: 1, borderColor: 'divider' }, surfaceSx.inset);

/**
 * The preview's title, coloured like a search result link. Classic keeps the
 * dark primary; the other skins use their accent, which is held to 4.5:1 on
 * their wells where the dark primary is not.
 */
const PREVIEW_TITLE_SX = skinned({ color: 'primary.dark' }, { color: tokenVar('accentText') });

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
        sx={[{ p: 2, borderRadius: 2, maxWidth: 600 }, PREVIEW_WELL_SX]}
      >
        <Typography variant="caption" color="text.secondary">
          impactafricaalliance.org › impact › stories › {form.slug || 'story'}
        </Typography>
        <Typography sx={[{ fontWeight: 600, overflowWrap: 'anywhere' }, PREVIEW_TITLE_SX]}>
          {shownTitle.slice(0, SEO_TITLE_LIMIT)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
          {shownDescription.slice(0, SEO_DESCRIPTION_LIMIT)}
        </Typography>
      </Box>
    </Stack>
  );
};

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
    <ReviewSummary
      onEdit={goTo}
      disabled={disabled}
      sections={[
        {
          title: STORY_FORM_STEPS[0],
          step: 0,
          items: [
            { label: 'Title', value: form.title.trim() },
            { label: 'Web address', value: `/impact/stories/${form.slug}` },
            { label: 'Excerpt', value: form.excerpt.trim(), fullRow: true },
            {
              label: 'Cover',
              value: form.cover ? (
                <Stack direction="row" spacing={1.5} alignItems="center" component="span">
                  <Box
                    component="img"
                    src={form.cover.url}
                    alt=""
                    sx={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 1 }}
                  />
                  <span>{form.cover.alt?.trim() || 'No alt text yet'}</span>
                </Stack>
              ) : null,
            },
          ],
        },
        {
          title: STORY_FORM_STEPS[1],
          step: 1,
          items: [
            { label: 'Project', value: form.project?.title },
            { label: 'Programme', value: programme },
            { label: 'Country', value: form.country.trim() },
            { label: 'Tags', value: form.tags.join(', ') },
          ],
        },
        {
          title: STORY_FORM_STEPS[2],
          step: 2,
          items: [
            {
              label: 'Blocks',
              fullRow: true,
              value:
                form.blocks.length > 0 ? (
                  <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.75} component="span">
                    {form.blocks.map((block, index) => (
                      <Chip
                        key={block.id}
                        size="small"
                        component="span"
                        label={`${index + 1}. ${STORY_BLOCK_LABELS[block.type]}`}
                      />
                    ))}
                  </Stack>
                ) : null,
            },
          ],
        },
        {
          title: STORY_FORM_STEPS[3],
          step: 3,
          items: [
            { label: 'Search title', value: form.seoTitle.trim() || 'Uses the title' },
            {
              label: 'Search description',
              value: form.seoDescription.trim() || 'Uses the excerpt',
              fullRow: true,
            },
            { label: 'Share image', value: form.seoImage ? 'Set' : 'Uses the cover' },
          ],
        },
      ]}
    />
  );
};

/**
 * The checklist's panel. Its border keeps the verdict's colour (warning or
 * success) in every skin; the other skins add their raised surface to it.
 */
const CHECKLIST_SX = skinned(
  {},
  { bgcolor: tokenVar('surfaceRaisedBg'), boxShadow: tokenVar('surfaceRaisedShadow') },
);

/** What still stands between this story and the website, as the API will judge it. */
export const PublishChecklist = ({ problems }: { problems: string[] }): JSX.Element => (
  <Box
    sx={[
      {
        p: { xs: 1.5, sm: 2 },
        border: 1,
        borderRadius: 2,
        borderColor: problems.length > 0 ? 'warning.main' : 'success.main',
      },
      CHECKLIST_SX,
    ]}
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
