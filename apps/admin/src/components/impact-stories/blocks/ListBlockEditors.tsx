import type { StoryBlockData } from '@iaa/shared';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import { MediaUploadField } from '../../fields/MediaUploadField';

import {
  BlockTextField,
  fieldError,
  optionalText,
  RowsEditor,
  type BlockFieldsProps,
} from './fields';
import { linkProblem } from './TextBlockEditors';

type MetricRow = StoryBlockData<'metrics'>['items'][number];
type TimelineRow = StoryBlockData<'timeline'>['items'][number];
type PartnerRow = StoryBlockData<'partners'>['items'][number];

/** The optional heading every list block starts with. */
const ListHeading = <T extends 'metrics' | 'timeline' | 'partners'>({
  props,
  placeholder,
}: {
  props: BlockFieldsProps<T>;
  placeholder: string;
}): JSX.Element => (
  <TextField
    label="Heading (optional)"
    placeholder={placeholder}
    value={props.data.heading ?? ''}
    onChange={(event) =>
      props.onChange({ ...props.data, heading: optionalText(event.target.value) })
    }
    error={Boolean(fieldError(props, 'heading'))}
    helperText={fieldError(props, 'heading')}
    disabled={props.disabled}
    fullWidth
    slotProps={{ htmlInput: { maxLength: 120 } }}
  />
);

/** A row of headline numbers, such as "40+ girls taught". Eight at most, so each one lands. */
export const MetricsBlockEditor = (props: BlockFieldsProps<'metrics'>): JSX.Element => {
  const { data, onChange, disabled } = props;
  return (
    <Stack spacing={2}>
      <ListHeading props={props} placeholder="Results so far" />
      <RowsEditor<MetricRow>
        rows={data.items ?? []}
        onChange={(items) => onChange({ ...data, items })}
        noun="Number"
        max={8}
        emptyRow={() => ({ label: '', value: 0 })}
        disabled={disabled}
        error={fieldError(props, 'items')}
        renderRow={(row, update, index) => (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label="Number"
              type="number"
              size="small"
              required
              value={Number.isFinite(row.value) ? row.value : ''}
              onChange={(event) => update({ value: Number(event.target.value) })}
              error={Boolean(fieldError(props, `items.${index}.value`))}
              helperText={fieldError(props, `items.${index}.value`)}
              disabled={disabled}
              sx={{ width: { sm: 140 } }}
            />
            <TextField
              label="Suffix"
              size="small"
              placeholder="+ or %"
              value={row.suffix ?? ''}
              onChange={(event) => update({ suffix: optionalText(event.target.value) })}
              disabled={disabled}
              sx={{ width: { sm: 110 } }}
              slotProps={{ htmlInput: { maxLength: 12 } }}
            />
            <TextField
              label="What it counts"
              size="small"
              required
              placeholder="Girls taught to code"
              value={row.label}
              onChange={(event) => update({ label: event.target.value })}
              error={Boolean(fieldError(props, `items.${index}.label`))}
              helperText={fieldError(props, `items.${index}.label`)}
              disabled={disabled}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
          </Stack>
        )}
      />
    </Stack>
  );
};

/** Steps in order, each with a when and a what. */
export const TimelineBlockEditor = (props: BlockFieldsProps<'timeline'>): JSX.Element => {
  const { data, onChange, disabled } = props;
  return (
    <Stack spacing={2}>
      <ListHeading props={props} placeholder="How the year went" />
      <RowsEditor<TimelineRow>
        rows={data.items ?? []}
        onChange={(items) => onChange({ ...data, items })}
        noun="Step"
        max={20}
        emptyRow={() => ({ label: '', title: '' })}
        disabled={disabled}
        error={fieldError(props, 'items')}
        renderRow={(row, update, index) => (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="When"
                size="small"
                required
                placeholder="March 2026"
                value={row.label}
                onChange={(event) => update({ label: event.target.value })}
                error={Boolean(fieldError(props, `items.${index}.label`))}
                helperText={fieldError(props, `items.${index}.label`)}
                disabled={disabled}
                sx={{ width: { sm: 200 } }}
                slotProps={{ htmlInput: { maxLength: 60 } }}
              />
              <TextField
                label="What happened"
                size="small"
                required
                value={row.title}
                onChange={(event) => update({ title: event.target.value })}
                error={Boolean(fieldError(props, `items.${index}.title`))}
                helperText={fieldError(props, `items.${index}.title`)}
                disabled={disabled}
                fullWidth
                slotProps={{ htmlInput: { maxLength: 160 } }}
              />
            </Stack>
            <BlockTextField
              label="Details (optional)"
              multiline
              value={row.description}
              onChange={(value) => update({ description: optionalText(value) })}
              disabled={disabled}
              maxLength={500}
            />
          </>
        )}
      />
    </Stack>
  );
};

/** The organisations the work was done with; a logo is optional, a name is not. */
export const PartnersBlockEditor = (props: BlockFieldsProps<'partners'>): JSX.Element => {
  const { data, onChange, disabled } = props;
  return (
    <Stack spacing={2}>
      <ListHeading props={props} placeholder="Our partners" />
      <RowsEditor<PartnerRow>
        rows={data.items ?? []}
        onChange={(items) => onChange({ ...data, items })}
        noun="Partner"
        max={24}
        emptyRow={() => ({ name: '' })}
        disabled={disabled}
        error={fieldError(props, 'items')}
        renderRow={(row, update, index) => (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Name"
                size="small"
                required
                value={row.name}
                onChange={(event) => update({ name: event.target.value })}
                error={Boolean(fieldError(props, `items.${index}.name`))}
                helperText={fieldError(props, `items.${index}.name`)}
                disabled={disabled}
                fullWidth
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
              <TextField
                label="Website (optional)"
                size="small"
                value={row.url ?? ''}
                onChange={(event) => update({ url: optionalText(event.target.value) })}
                error={Boolean(linkProblem(row.url) ?? fieldError(props, `items.${index}.url`))}
                helperText={linkProblem(row.url) ?? fieldError(props, `items.${index}.url`)}
                disabled={disabled}
                fullWidth
                slotProps={{ htmlInput: { maxLength: 2000 } }}
              />
            </Stack>
            <MediaUploadField
              label="Logo (optional)"
              accept="image/*"
              preview
              value={row.logo ?? undefined}
              // The partner's name is the logo's description on the site.
              onChange={(logo) => update({ logo: logo ? { ...logo, alt: row.name } : null })}
              onUploadingChange={props.onUploadingChange}
              folder="stories"
            />
          </>
        )}
      />
    </Stack>
  );
};
