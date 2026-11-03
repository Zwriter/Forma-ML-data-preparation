import type { Column } from './dataset';

export type StepType =
  | 'fill_null'
  | 'replace_values'
  | 'convert_type'
  | 'split_column'
  | 'merge_columns'
  | 'drop_duplicates'
  | 'drop_null_rows'
  | 'drop_columns'
  | 'rename_columns';

export type CleaningStep = {
  id: string;
  type: StepType;
  parameters: Record<string, unknown>;
  enabled: boolean;
};

export type Operation = {
  type: string;
  parameters: Record<string, unknown>;
  enabled: boolean;
  order: number;
  operation_id?: string;
};

export type StepForm = { type: StepType; editingId: string | null };

export type StepValidation = {
  index: number;
  operation_id?: string;
  valid: boolean;
  message?: string;
};

export type ChangeSummary = {
  rows_before: number;
  rows_after: number;
  rows_removed: number;
  values_changed: number;
  columns_added: string[];
  columns_removed: string[];
  columns_renamed: { from: string; to: string }[];
};

export type CleaningPreview = {
  columns_before: Column[];
  columns: Column[];
  before: Record<string, unknown>[];
  after: Record<string, unknown>[];
  removed_rows: number[];
  changed_cells: { row: number; column: string }[];
  summary: ChangeSummary;
};
