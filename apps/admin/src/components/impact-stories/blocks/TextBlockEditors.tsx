import { isSafeLink } from '@iaa/shared';
import Stack from '@mui/material/Stack';

import { MarkdownEditor } from '../../markdown/MarkdownEditor';

import {
  BlockTextField,
  fieldError,
  ImageWithAltField,
  optionalText,
  type BlockFieldsProps,
} from './fields';

/** The opening of the story: a large heading over a picture. */
export const HeroBlockEditor = (props: BlockFieldsProps<'hero'>): JSX.Element => {
  const { data, onChange, disabled } = props;
  return (
    <Stack spacing={2}>
      <BlockTextField
        label="Eyebrow"
        value={data.eyebrow}
        onChange={(value) => onChange({ ...data, eyebrow: optionalText(value) })}
        error={fieldError(props, 'eyebrow')}
        helperText="A short line above the heading, such as the programme name."
        disabled={disabled}
        maxLength={60}
      />
      <BlockTextField
        label="Heading"
        required
        value={data.heading}
        onChange={(value) => onChange({ ...data, heading: value })}
        error={fieldError(props, 'heading')}
        disabled={disabled}
        maxLength={160}
      />
      <BlockTextField
        label="Subheading"
        multiline
        value={data.subheading}
        onChange={(value) => onChange({ ...data, subheading: optionalText(value) })}
        error={fieldError(props, 'subheading')}
        disabled={disabled}
        maxLength={300}
      />
      <ImageWithAltField
        label="Background image"
        value={data.image}
        onChange={(image) => onChange({ ...data, image: image ?? null })}
        error={fieldError(props, 'image')}
        onUploadingChange={props.onUploadingChange}
        disabled={disabled}
      />
    </Stack>
  );
};

/** Paragraphs in Markdown, rendered on the site without raw HTML. */
export const RichTextBlockEditor = (props: BlockFieldsProps<'rich-text'>): JSX.Element => (
  <MarkdownEditor
    label="Text"
    value={props.data.markdown ?? ''}
    onChange={(markdown) => props.onChange({ ...props.data, markdown })}
    error={fieldError(props, 'markdown')}
    minRows={8}
  />
);

/** Someone's own words, and who said them. */
export const QuoteBlockEditor = (props: BlockFieldsProps<'quote'>): JSX.Element => {
  const { data, onChange, disabled } = props;
  return (
    <Stack spacing={2}>
      <BlockTextField
        label="Quote"
        required
        multiline
        value={data.text}
        onChange={(value) => onChange({ ...data, text: value })}
        error={fieldError(props, 'text')}
        disabled={disabled}
        maxLength={600}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <BlockTextField
          label="Who said it"
          value={data.attribution}
          onChange={(value) => onChange({ ...data, attribution: optionalText(value) })}
          error={fieldError(props, 'attribution')}
          disabled={disabled}
          maxLength={120}
        />
        <BlockTextField
          label="Their role"
          value={data.role}
          onChange={(value) => onChange({ ...data, role: optionalText(value) })}
          error={fieldError(props, 'role')}
          helperText="Such as “Club member, Tamale”."
          disabled={disabled}
          maxLength={120}
        />
      </Stack>
      <ImageWithAltField
        label="Photo (optional)"
        value={data.photo}
        onChange={(photo) => onChange({ ...data, photo: photo ?? null })}
        error={fieldError(props, 'photo')}
        onUploadingChange={props.onUploadingChange}
        disabled={disabled}
      />
    </Stack>
  );
};

/**
 * The link a call to action points at, checked as it is typed: only https
 * addresses and pages on this site, so a story can never carry a script link.
 */
export const linkProblem = (url: string | undefined): string | undefined =>
  url && !isSafeLink(url.trim())
    ? 'Use a link starting with https://, or a page on this site such as /get-involved.'
    : undefined;

/** A closing prompt: donate, volunteer, read more. */
export const CtaBlockEditor = (props: BlockFieldsProps<'cta'>): JSX.Element => {
  const { data, onChange, disabled } = props;
  return (
    <Stack spacing={2}>
      <BlockTextField
        label="Heading"
        required
        value={data.heading}
        onChange={(value) => onChange({ ...data, heading: value })}
        error={fieldError(props, 'heading')}
        disabled={disabled}
        maxLength={160}
      />
      <BlockTextField
        label="Text"
        multiline
        value={data.body}
        onChange={(value) => onChange({ ...data, body: optionalText(value) })}
        error={fieldError(props, 'body')}
        disabled={disabled}
        maxLength={400}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <BlockTextField
          label="Button label"
          required
          value={data.label}
          onChange={(value) => onChange({ ...data, label: value })}
          error={fieldError(props, 'label')}
          helperText="Such as “Volunteer with us”."
          disabled={disabled}
          maxLength={40}
        />
        <BlockTextField
          label="Button link"
          required
          value={data.url}
          onChange={(value) => onChange({ ...data, url: value })}
          error={linkProblem(data.url) ?? fieldError(props, 'url')}
          helperText="https://… or a page on this site, such as /get-involved."
          disabled={disabled}
          maxLength={2000}
        />
      </Stack>
    </Stack>
  );
};
