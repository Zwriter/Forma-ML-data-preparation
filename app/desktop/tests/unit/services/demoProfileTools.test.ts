import { describe, expect, it } from 'vitest';
import { demoProfileTool, DEMO_TOOL_METHODS } from '../../../src/services/demoProfileTools';
import type {
  Anomalies,
  ColumnDetail,
  DistributionDetail,
  DuplicateGroups,
  Patterns,
  RowsPage,
  Suggestions,
} from '../../../src/types/profileTools';

const base = { dataset_id: 'demo', data_version: 'demo-v1' };
const run = <T>(method: string, params: Record<string, unknown> = {}) => {
  const ack = demoProfileTool(method, { ...base, ...params });
  expect(ack).toMatchObject({ state: 'completed' });
  expect(ack.result).toMatchObject(base);
  return ack.result as T;
};

describe('demo profile tools', () => {
  it('answers exactly the seven tool methods', () => {
    expect([...DEMO_TOOL_METHODS].sort()).toEqual(
      [
        'profile.anomalies',
        'profile.column_detail',
        'profile.distribution',
        'profile.duplicates',
        'profile.patterns',
        'profile.rows',
        'profile.suggestions',
      ].sort(),
    );
  });

  it('column detail describes the asked column', () => {
    const numeric = run<ColumnDetail>('profile.column_detail', { column: 'TotalCharges' });
    expect(numeric.column.name).toBe('TotalCharges');
    expect(numeric.quartiles).not.toBeNull();
    expect(numeric.invalid_values).toHaveLength(1);
    expect(numeric.invalid_values[0].count).toBe(11);
    const text = run<ColumnDetail>('profile.column_detail', { column: 'Contract' });
    expect(text.quartiles).toBeNull();
    expect(text.text_length).not.toBeNull();
  });

  it('pages problem rows and marks every problem cell', () => {
    const page = run<RowsPage>('profile.rows', {
      filter: { kind: 'problems', column: null },
      offset: 100,
      limit: 100,
    });
    expect(page.offset).toBe(100);
    expect(page.rows).toHaveLength(100);
    expect(page.rows[0].row).toBeGreaterThan(100);
    for (const row of page.rows) {
      expect(row.values).toHaveLength(page.columns.length);
      expect(Object.keys(row.marks).length).toBeGreaterThan(0);
    }
    const one = run<RowsPage>('profile.rows', {
      filter: { kind: 'problems', column: 'TotalCharges' },
      offset: 0,
      limit: 100,
    });
    expect(one.total).toBe(1521 + 11);
    expect(one.rows.every((row) => 'TotalCharges' in row.marks)).toBe(true);
  });

  it('rebins a distribution to the asked bar count without losing values', () => {
    const detail = run<DistributionDetail>('profile.distribution', {
      column: 'MonthlyCharges',
      bins: 50,
    });
    expect(detail.bins).toHaveLength(50);
    expect(detail.bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(7043 - 463);
    expect(detail.box.q1).toBeLessThanOrEqual(detail.box.median);
    expect(detail.box.median).toBeLessThanOrEqual(detail.box.q3);
  });

  it('finds duplicates for all columns and for a key subset', () => {
    const all = run<DuplicateGroups>('profile.duplicates', { columns: null });
    expect(all).toMatchObject({ duplicate_rows: 14, group_count: 14 });
    const contract = run<DuplicateGroups>('profile.duplicates', { columns: ['Contract'] });
    expect(contract.group_count).toBe(3);
    expect(contract.duplicate_rows).toBe(7043 - 3);
    expect(contract.groups[0].values).toHaveLength(1);
  });

  it('describes patterns, anomalies and suggestions', () => {
    const patterns = run<Patterns>('profile.patterns');
    const size = patterns.correlation.columns.length;
    expect(patterns.correlation.matrix).toHaveLength(size);
    expect(patterns.correlation.strongest.length).toBeGreaterThan(0);
    expect(patterns.formats.find((f) => f.column === 'customerID')?.formats[0].shape).toBe(
      '9999-AAAAA',
    );

    const anomalies = run<Anomalies>('profile.anomalies');
    expect(anomalies.columns.find((c) => c.column === 'SeniorCitizen')?.note).toBe('no_spread');

    const suggestions = run<Suggestions>('profile.suggestions');
    const kinds = suggestions.recommendations.map((s) => s.kind);
    expect(kinds).toContain('convert');
    expect(kinds).toContain('fill_missing');
    expect(kinds).toContain('remove_duplicates');
  });
});
