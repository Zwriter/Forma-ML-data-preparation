import type { ColumnProfile, DetectedType, Profile, QualityLevel } from '../types/profile';
import specs from './demoProfileColumns.json';

/** Static demo profile shaped like the mockup; demo mode has no engine to compute one. */

const ROWS = 7043;
const DUPLICATE_ROWS = 14;

type Spec = {
  name: string;
  type: DetectedType;
  stored?: string;
  missing?: number;
  invalid?: number;
  unique: number;
  quality: QualityLevel;
  examples: string[];
  categories?: [string, number][];
  uniqueValues?: string[];
  numeric?: { mean: number; median: number; std: number; min: number; max: number } & {
    start: number;
    width: number;
    weights: number[];
  };
};

/** Splits `total` by `weights`; the largest weight takes the rounding remainder. */
function split(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((weight) => Math.floor((weight / sum) * total));
  const largest = weights.indexOf(Math.max(...weights));
  counts[largest] += total - counts.reduce((a, b) => a + b, 0);
  return counts;
}

function summaries(spec: Spec, present: number): Pick<ColumnProfile, 'numeric' | 'categories'> {
  if (spec.numeric) {
    const { start, width, weights, ...stats } = spec.numeric;
    const histogram = split(present, weights).map((count, index) => ({
      start: start + index * width,
      end: start + (index + 1) * width,
      count,
    }));
    return { numeric: { ...stats, histogram }, categories: null };
  }
  if (spec.uniqueValues) {
    const top = spec.uniqueValues.map((value) => ({ value, count: 1 }));
    const categories = { top, other_count: present - top.length, distinct_count: spec.unique };
    return { numeric: null, categories };
  }
  const values = spec.categories ?? [];
  const counts = split(
    present,
    values.map(([, weight]) => weight),
  );
  const top = values.map(([value], index) => ({ value, count: counts[index] }));
  return { numeric: null, categories: { top, other_count: 0, distinct_count: spec.unique } };
}

const columns: ColumnProfile[] = (specs as Spec[]).map((spec, index) => {
  const missing = spec.missing ?? 0;
  const invalid = spec.invalid ?? 0;
  const present = ROWS - missing - invalid;
  return {
    position: index + 1,
    name: spec.name,
    stored_type: spec.stored ?? 'String',
    detected_type: spec.type,
    missing_count: missing,
    invalid_count: invalid,
    unique_count: spec.unique,
    completeness: present / ROWS,
    quality: spec.quality,
    examples: spec.examples,
    ...summaries(spec, present),
  };
});

const missingCells = columns.reduce((total, column) => total + column.missing_count, 0);
const invalidCells = columns.reduce((total, column) => total + column.invalid_count, 0);
const totalCells = ROWS * columns.length;
const validCells = totalCells - missingCells - invalidCells;

export const demoProfile: Profile = {
  dataset_id: 'demo-dataset',
  history_id: 'demo-history',
  data_version: 'demo-v1',
  computed_at: '2026-11-05T10:24:00Z',
  row_count: ROWS,
  column_count: columns.length,
  missing_cells: missingCells,
  duplicate_rows: DUPLICATE_ROWS,
  quality: {
    total_cells: totalCells,
    valid_cells: validCells,
    missing_cells: missingCells,
    invalid_cells: invalidCells,
    completeness: validCells / totalCells,
  },
  columns,
};
