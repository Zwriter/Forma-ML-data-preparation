import { describe, expect, it } from 'vitest';
import { demoView, sortDemoRecords } from '../../../src/services/demoView';

describe('demo sort view', () => {
  it('reads the sort from the URL', () => {
    expect(demoView('?demo-sort=region:descending,units')).toEqual([
      { column: 'region', direction: 'descending', nulls: 'last' },
      { column: 'units', direction: 'ascending', nulls: 'last' },
    ]);
    expect(demoView('')).toEqual([]);
  });

  it('sorts numbers as numbers and keeps ties in stored order', () => {
    const records = [
      { id: '1', units: '9' },
      { id: '2', units: '10' },
      { id: '3', units: '9' },
    ];

    const sorted = sortDemoRecords(records, demoView('?demo-sort=units:descending'));

    expect(sorted.map((record) => record.id)).toEqual(['2', '1', '3']);
  });
});
