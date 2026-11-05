/** Profile shapes returned by `dataset.profile`; see specs/005-data-profile/data-model.md. */

export type DetectedType = 'integer' | 'decimal' | 'datetime' | 'boolean' | 'text' | 'other';

export type QualityLevel = 'good' | 'needs_attention' | 'poor';

export type QualityBreakdown = {
  total_cells: number;
  valid_cells: number;
  missing_cells: number;
  invalid_cells: number;
  /** `null` when the dataset has no cells. */
  completeness: number | null;
};

export type HistogramBin = {
  /** ISO strings for date/time columns. */
  start: number | string;
  end: number | string;
  count: number;
};

export type NumericSummary = {
  mean: number | string;
  median: number | string;
  std: number;
  min: number | string;
  max: number | string;
  histogram: HistogramBin[];
};

export type CategorySummary = {
  top: { value: string; count: number }[];
  other_count: number;
  distinct_count: number;
};

export type ColumnProfile = {
  position: number;
  name: string;
  stored_type: string;
  detected_type: DetectedType;
  missing_count: number;
  invalid_count: number;
  unique_count: number;
  /** `null` when the dataset has 0 rows. */
  completeness: number | null;
  quality: QualityLevel;
  examples: string[];
  numeric: NumericSummary | null;
  categories: CategorySummary | null;
};

export type Profile = {
  dataset_id: string;
  history_id: string;
  data_version: string;
  computed_at: string;
  row_count: number;
  column_count: number;
  missing_cells: number;
  duplicate_rows: number;
  quality: QualityBreakdown;
  columns: ColumnProfile[];
};
