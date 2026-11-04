import type { CleaningPreview, Operation } from '../types/cleaning';
import type { Preview } from '../types/dataset';

/** Demo mode has no engine: every step is reported valid. */
export function validateDemoCleaning(operations: Operation[]) {
  return {
    valid: true,
    steps: operations.map((operation, index) => ({
      index,
      operation_id: operation.operation_id,
      valid: true,
    })),
  };
}

// shortcut: only whole-cell replace_values changes the demo page, so Playwright can see markers;
// other steps pass through and the summary covers this page. Use the engine for real results.
export function previewDemoCleaning(page: Preview, operations: Operation[]): CleaningPreview {
  const total = page.total_count ?? page.records.length;
  const changed: CleaningPreview['changed_cells'] = [];
  const rows = page.records.map((record, row) => {
    const values: Record<string, unknown> = { ...record };
    for (const { type, parameters: p, enabled } of operations) {
      if (!enabled || type !== 'replace_values' || p.match === 'contains') continue;
      const same = (value: unknown) =>
        p.case_sensitive
          ? value === p.find
          : String(value).toLowerCase() === String(p.find).toLowerCase();
      for (const column of (p.columns as string[]) ?? []) {
        if (!(column in values) || !same(values[column])) continue;
        values[column] = p.replace;
        changed.push({ row, column });
      }
    }
    return { values, removed: false };
  });
  return {
    columns: page.columns.map((column) => ({ ...column, origin: column.name })),
    rows,
    changed_cells: changed,
    offset: page.offset,
    limit: page.limit,
    total_count: total,
    summary: {
      rows_before: total,
      rows_after: total,
      rows_removed: 0,
      values_changed: changed.length,
      columns_added: [],
      columns_removed: [],
      columns_renamed: [],
    },
  };
}
