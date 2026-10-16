import type { Dataset, HistoryMetadata, Preview } from './dataset';

export type DataOperationType = 'filter_rows' | 'sort_rows' | 'group_by' | 'pivot' | 'unpivot';
export type AggregateFunction = 'count' | 'sum' | 'average' | 'minimum' | 'maximum';
export type FilterOperator =
  | 'equals' | 'not_equals' | 'contains' | 'begins_with' | 'ends_with'
  | 'greater_than' | 'less_than' | 'at_least' | 'at_most' | 'is_empty' | 'is_not_empty';

export type FilterRule = {
  column: string;
  operator: FilterOperator;
  value?: string | number | boolean | null;
  case_sensitive?: boolean;
};
export type SortKey = { column: string; direction: 'ascending' | 'descending'; nulls: 'first' | 'last' };
export type Aggregation = { column: string | null; function: AggregateFunction; output_name: string };

export type DataOperation =
  | { type: 'filter_rows'; parameters: { mode: 'all' | 'any'; rules: FilterRule[] } }
  | { type: 'sort_rows'; parameters: { keys: SortKey[] } }
  | { type: 'group_by'; parameters: { group_columns: string[]; aggregations: Aggregation[] } }
  | { type: 'pivot'; parameters: { row_columns: string[]; category_column: string; value_column: string; function: AggregateFunction } }
  | { type: 'unpivot'; parameters: { identifier_columns: string[]; value_columns: string[]; attribute_name: string; value_name: string } };

export type JobAcknowledgement = { job_id: string; state: 'pending' | 'running' };
export type OperationResult = { dataset: Dataset; history: HistoryMetadata; preview?: Preview };
export type SaveResult = {
  destination: string;
  format: 'csv' | 'parquet';
  row_count: number;
  schema: Dataset['schema'];
  replaced_existing: boolean;
  validated: true;
  history: HistoryMetadata;
};
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'dirty' | 'failed';
