import { describe, expect, it } from 'vitest';
import { toWorksheet } from '../../../src/features/cleaning/previewMarkers';
import type { CleaningPreview } from '../../../src/types/cleaning';

const preview: CleaningPreview = {
  columns: [
    { name: 'total', type: 'Float64', nullable: true, origin: 'charges' },
    { name: 'id', type: 'String', nullable: true, origin: 'id' },
    { name: 'key', type: 'String', nullable: true, origin: null },
  ],
  rows: [
    { values: { total: 0, id: 'b', key: 'b-1' }, removed: false },
    { values: { total: null, id: 'b', key: null }, removed: true },
  ],
  changed_cells: [{ row: 0, column: 'total' }],
  offset: 20,
  limit: 50,
  total_count: 90,
  summary: {
    rows_before: 90,
    rows_after: 89,
    rows_removed: 1,
    values_changed: 1,
    columns_added: ['key'],
    columns_removed: [],
    columns_renamed: [{ from: 'charges', to: 'total' }],
  },
};

describe('preview markers', () => {
  it('turns a cleaning page into a worksheet page with markers', () => {
    const { page, markers } = toWorksheet('dataset-1', preview);
    expect(page).toEqual({
      dataset_id: 'dataset-1',
      columns: [
        { name: 'total', type: 'Float64', nullable: true },
        { name: 'id', type: 'String', nullable: true },
        { name: 'key', type: 'String', nullable: true },
      ],
      records: preview.rows.map((row) => row.values),
      offset: 20,
      limit: 50,
      total_count: 90,
    });
    expect([...markers.changed]).toEqual(['0:total']);
    expect([...markers.removed]).toEqual([1]);
    expect(markers.columnNotes).toEqual({ total: 'Renamed from charges', key: 'New column' });
  });
});
