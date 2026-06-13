import type { GridColDef } from '@mui/x-data-grid';
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
}

export type ResourceRow = Record<string, unknown> & { id: string };
