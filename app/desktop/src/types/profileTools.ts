import type { ColumnProfile, HistogramBin } from './profile';

/** Results of the Profile ribbon tools (specs/005-data-profile/data-model.md). */

type Stamp = { dataset_id: string; data_version: string; computed_at: string };

export type ColumnDetail = Stamp & {
  column: ColumnProfile;
  quartiles: { q1: number | string; median: number | string; q3: number | string } | null;
  text_length: { min: number; max: number; mean: number } | null;
  invalid_values: { value: string; count: number; reason: string }[];
};

export type CellMark = 'missing' | 'invalid' | 'outlier';

export type RowsPage = Stamp & {
  columns: string[];
  total: number;
  offset: number;
  rows: {
    row: number;
    values: (string | null)[];
    marks: Record<string, CellMark>;
    reasons: Record<string, string>;
  }[];
};

export type BoxSummary = {
  q1: number;
  median: number;
  q3: number;
  lower_whisker: number;
  upper_whisker: number;
  outliers: number;
};

export type DistributionDetail = Stamp & { column: string; bins: HistogramBin[]; box: BoxSummary };

export type DuplicateGroups = Stamp & {
  columns: string[];
  duplicate_rows: number;
  group_count: number;
  groups: { values: (string | null)[]; size: number }[];
};

export type ValueFormat = { shape: string; count: number; share: number };

export type Patterns = Stamp & {
  correlation: {
    columns: string[];
    left_out: number;
    matrix: (number | null)[][];
    strongest: { a: string; b: string; r: number }[];
  };
  formats: { column: string; formats: ValueFormat[]; mixed: boolean }[];
};

export type OutlierSummary = {
  column: string;
  low: number | string;
  high: number | string;
  count: number;
  share: number;
  extremes: string[];
  note: 'no_spread' | null;
};

export type Anomalies = Stamp & { columns: OutlierSummary[] };

export type SuggestionKind =
  | 'convert'
  | 'fill_missing'
  | 'drop_empty'
  | 'drop_constant'
  | 'remove_duplicates'
  | 'date_parts'
  | 'split';

export type Suggestion = {
  id: string;
  kind: SuggestionKind;
  title: string;
  detail: string;
  cells_affected: number;
  steps: { type: string; parameters: Record<string, unknown> }[];
  examples: { before: string; after: string[] }[] | null;
};

export type Suggestions = Stamp & { recommendations: Suggestion[]; creations: Suggestion[] };
