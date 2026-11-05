import type { SortKey } from '../types/dataOperations';

/**
 * Browser demo only: a sort view read from `?demo-sort=region:descending,units:ascending`,
 * so UI tests can show sorted headers without the engine.
 */
export function demoView(search = window.location.search): SortKey[] {
  const spec = new URLSearchParams(search).get('demo-sort');
  if (!spec) return [];
  return spec.split(',').map((part) => {
    const [column, direction] = part.split(':');
    return {
      column,
      direction: direction === 'descending' ? 'descending' : 'ascending',
      nulls: 'last',
    };
  });
}

/** Stable sort of demo records by the view; numbers compare as numbers. */
export function sortDemoRecords<T extends Record<string, string>>(records: T[], view: SortKey[]) {
  if (!view.length) return records;
  const compare = (left: string, right: string) => {
    const a = Number(left);
    const b = Number(right);
    return left !== '' && right !== '' && Number.isFinite(a) && Number.isFinite(b)
      ? a - b
      : left.localeCompare(right);
  };
  return [...records].sort((left, right) => {
    for (const key of view) {
      const order = compare(left[key.column] ?? '', right[key.column] ?? '');
      if (order) return key.direction === 'descending' ? -order : order;
    }
    return 0;
  });
}
