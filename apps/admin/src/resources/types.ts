import type { GridColDef } from '@mui/x-data-grid';
import type { ReactNode } from 'react';
import type { ZodTypeAny } from 'zod';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'slug'
  | 'select'
  /** Laid out as cards rather than a dropdown, for options you choose by looking. */
  | 'choice'
  | 'switch'
  | 'tags'
  | 'datetime'
  | 'image'
  | 'file'
  | 'questions';

export interface SelectOption {
  value: string;
  label: string;
  /** One line on what choosing this means. Shown under the label in the menu. */
  description?: string;
  icon?: ReactNode;
  /** A colour chip shown before the label — for options that are a colour. */
  swatch?: string;
  /** Full-bleed preview for the card layout; ignored by the dropdown. */
  preview?: ReactNode;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  options?: SelectOption[];
  helperText?: string;
  /** Span both columns of the form grid. */
  wide?: boolean;
}

export interface ResourceConfig {
  /** Route + API segment, e.g. "articles". */
  key: string;
  label: string;
  singular: string;
  createSchema: ZodTypeAny;
  fields: FieldConfig[];
  columns: GridColDef[];
  defaultValues: Record<string, unknown>;
  /** Optional one-line subtitle shown beneath the page title. */
  description?: string;
  /** Optional icon used in the page header + empty state (ResourcePage falls back to a default). */
  icon?: JSX.Element;
  /** Optional empty-state copy overrides (ResourcePage derives sensible defaults otherwise). */
  emptyTitle?: string;
  emptyDescription?: string;
  /** Optional live preview rendered from the current form values (e.g. articles). */
  renderPreview?: (values: Record<string, unknown>) => ReactNode;
}

export type ResourceRow = Record<string, unknown> & { id: string };
