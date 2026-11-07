import type { ColumnProfile } from '../types/profile';
import { demoProfile } from './demoProfile';

/** Shared lookups for the demo tool answers (demoProfileTools, demoProfileInsights). */

export const ROWS = demoProfile.row_count;
export const columns = demoProfile.columns;
export const named = (name: unknown) =>
  columns.find((column) => column.name === name) ?? columns[0];
export const round = (value: number) => Math.round(value * 100) / 100;
export const problems = (column: ColumnProfile) => column.missing_count + column.invalid_count;

/** The value at `share` of the way through the histogram; integer bins are single values. */
function quantile(column: ColumnProfile, share: number) {
  const bins = column.numeric!.histogram;
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  let seen = 0;
  for (const bin of bins) {
    if (seen + bin.count >= share * total) {
      const [start, end] = [Number(bin.start), Number(bin.end)];
      if (column.detected_type === 'integer') return start;
      return round(start + ((share * total - seen) / (bin.count || 1)) * (end - start));
    }
    seen += bin.count;
  }
  return Number(bins.at(-1)!.end);
}

export function quartiles(column: ColumnProfile) {
  if (!column.numeric) return null;
  return {
    q1: quantile(column, 0.25),
    median: quantile(column, 0.5),
    q3: quantile(column, 0.75),
  };
}
