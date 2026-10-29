export type Column = { name: string; type: string; nullable: boolean };
export type Dataset = {
  dataset_id: string;
  source_path: string;
  format: 'csv' | 'parquet';
  schema: Column[];
  columns: number;
  rows: number | null;
  state: string;
};
export type Preview = {
  dataset_id: string;
  columns: Column[];
  records: Record<string, unknown>[];
  offset: number;
  limit: number;
  total_count: number | null;
};

export type HistoryMetadata = {
  history_id: string;
  dataset_id: string;
  current_index: number;
  saved_index: number;
  is_dirty: boolean;
  can_undo: boolean;
  can_redo: boolean;
};

export type DatasetResult = { dataset: Dataset; history: HistoryMetadata };
