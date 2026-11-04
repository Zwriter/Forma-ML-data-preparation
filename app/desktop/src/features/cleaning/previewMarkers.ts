import type { CleaningPreview, WorksheetMarkers } from '../../types/cleaning';
import type { Preview } from '../../types/dataset';

/** Shape a cleaning page like a Data-tab page so the same worksheet can show it. */
export function toWorksheet(
  datasetId: string,
  preview: CleaningPreview,
): { page: Preview; markers: WorksheetMarkers } {
  const columnNotes: Record<string, string> = {};
  for (const column of preview.columns) {
    if (column.origin === null) columnNotes[column.name] = 'New column';
    else if (column.origin !== column.name)
      columnNotes[column.name] = `Renamed from ${column.origin}`;
  }
  return {
    page: {
      dataset_id: datasetId,
      columns: preview.columns.map(({ origin: _origin, ...column }) => column),
      records: preview.rows.map((row) => row.values),
      offset: preview.offset,
      limit: preview.limit,
      total_count: preview.total_count,
    },
    markers: {
      changed: new Map(
        preview.changed_cells.map((cell) => [`${cell.row}:${cell.column}`, cell.before]),
      ),
      removed: new Set(preview.rows.flatMap((row, index) => (row.removed ? [index] : []))),
      columnNotes,
    },
  };
}
