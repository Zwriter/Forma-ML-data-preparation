import { describe, expect, it } from 'vitest';
import { buildSaveCopyDestination } from '../../../src/services/saveDestination';

describe('buildSaveCopyDestination', () => {
  it('adds copy and local date before the original format extension', () => {
    expect(buildSaveCopyDestination('C:\\data\\sales.csv', 'csv', new Date(2026, 9, 19))).toBe(
      'C:\\data\\sales-copy-2026-10-19.csv',
    );
  });

  it('supports forward-slash paths and parquet files', () => {
    expect(buildSaveCopyDestination('/data/sales.parquet', 'parquet', new Date(2026, 0, 3))).toBe(
      '/data/sales-copy-2026-01-03.parquet',
    );
  });
});
