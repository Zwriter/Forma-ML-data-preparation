import { describe, expect, it } from 'vitest';
import {
  countLabel,
  filterColumns,
  sortColumns,
} from '../../../src/features/profiling/columns/columnTableModel';
import { demoProfile } from '../../../src/services/demoProfile';
import type { ColumnProfile } from '../../../src/types/profile';

const columns = demoProfile.columns;
const names = (list: ColumnProfile[]) => list.map((column) => column.name);
const all = { search: '', type: 'all', quality: 'all' } as const;

describe('filterColumns', () => {
  it('searches names case-insensitively', () => {
    expect(names(filterColumns(columns, { ...all, search: 'charges' }))).toEqual([
      'MonthlyCharges',
      'TotalCharges',
    ]);
  });

  it('combines search with type and quality filters', () => {
    expect(names(filterColumns(columns, { ...all, type: 'integer' }))).toEqual([
      'SeniorCitizen',
      'tenure',
    ]);
    expect(names(filterColumns(columns, { ...all, quality: 'poor' }))).toEqual(['TotalCharges']);
    expect(
      names(filterColumns(columns, { search: 'o', type: 'text', quality: 'needs_attention' })),
    ).toEqual(['OnlineSecurity', 'OnlineBackup']);
  });
});

describe('sortColumns', () => {
  it('sorts by any key both ways with position breaking ties', () => {
    const byMissing = sortColumns(columns, { key: 'missing', direction: 'descending' });
    expect(names(byMissing).slice(0, 2)).toEqual(['TotalCharges', 'MonthlyCharges']);
    // Columns with no missing values keep schema order among themselves.
    expect(names(byMissing).slice(-2)).toEqual(['PaymentMethod', 'Churn']);

    const byName = sortColumns(columns, { key: 'name', direction: 'ascending' });
    expect(names(byName)[0]).toBe('Churn');
    expect(names(sortColumns(columns, { key: 'position', direction: 'descending' }))[0]).toBe(
      'Churn',
    );
  });

  it('orders quality from worst to best ascending and puts null completeness last', () => {
    const byQuality = sortColumns(columns, { key: 'quality', direction: 'ascending' });
    expect(byQuality[0].quality).toBe('poor');
    expect(byQuality.at(-1)!.quality).toBe('good');

    const withNull = [{ ...columns[0], completeness: null }, columns[1]];
    for (const direction of ['ascending', 'descending'] as const) {
      expect(sortColumns(withNull, { key: 'completeness', direction }).at(-1)!.completeness).toBe(
        null,
      );
    }
  });

  it('handles 500 columns well within 200 ms', () => {
    const many = Array.from({ length: 500 }, (_, index) => ({
      ...columns[index % columns.length],
      position: index + 1,
      name: `column_${index}`,
    }));
    const started = performance.now();
    sortColumns(filterColumns(many, { ...all, search: '1' }), {
      key: 'completeness',
      direction: 'descending',
    });
    expect(performance.now() - started).toBeLessThan(200);
  });
});

describe('countLabel', () => {
  it('shows the total, or visible of total when filtered', () => {
    expect(countLabel(21, 21)).toBe('21 columns');
    expect(countLabel(3, 21)).toBe('3 of 21 columns');
    expect(countLabel(1, 1)).toBe('1 column');
  });
});
