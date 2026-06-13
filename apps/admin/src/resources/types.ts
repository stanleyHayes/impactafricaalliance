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
  | 'switch'
  | 'tags'
  | 'datetime'
  | 'image'
  | 'file';

export interface SelectOption {
  value: string;
  label: string;
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
