import { describe, expect, it } from 'vitest';
import { demoProfile } from '../../../src/services/demoProfile';

describe('demoProfile fixture', () => {
  const { columns, quality } = demoProfile;

  it('matches the mockup totals', () => {
    expect(demoProfile).toMatchObject({
      row_count: 7043,
      column_count: 21,
      missing_cells: 3218,
      duplicate_rows: 14,
      history_id: 'demo-history',
      data_version: 'demo-v1',
    });
    expect(columns).toHaveLength(21);
  });

  it('keeps cells and summaries consistent', () => {
    expect(quality.valid_cells + quality.missing_cells + quality.invalid_cells).toBe(
      quality.total_cells,
    );
    for (const column of columns) {
      const present = demoProfile.row_count - column.missing_count - column.invalid_count;
      const summed = column.numeric
        ? column.numeric.histogram.reduce((total, bin) => total + bin.count, 0)
        : column.categories!.top.reduce((total, item) => total + item.count, 0) +
          column.categories!.other_count;
      expect(summed, column.name).toBe(present);
      expect(column.examples.length).toBeLessThanOrEqual(3);
    }
  });

  it('covers every quality level, invalid values, and 11+ columns with missing values', () => {
    expect(new Set(columns.map((column) => column.quality))).toEqual(
      new Set(['good', 'needs_attention', 'poor']),
    );
    expect(columns.some((column) => column.invalid_count > 0)).toBe(true);
    expect(columns.filter((column) => column.missing_count > 0).length).toBeGreaterThanOrEqual(11);
  });

  it('labels quality with the FR-011 rule', () => {
    for (const column of columns) {
      const completeness = column.completeness!;
      const invalidShare = column.invalid_count / demoProfile.row_count;
      const expected =
        completeness < 0.9 || invalidShare > 0.01
          ? 'poor'
          : completeness < 0.99 || column.invalid_count > 0
            ? 'needs_attention'
            : 'good';
      expect(column.quality, column.name).toBe(expected);
    }
  });
});
