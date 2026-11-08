import { useEffect, useRef, useState } from 'react';
import { useProfileToolStore } from '../../../stores/profileToolStore';
import type { RowsPage } from '../../../types/profileTools';
import { formatCount } from '../profileFormat';
import { RowsGrid } from './RowsGrid';
import { ToolView } from './ToolView';
import { useLatestProfile, useTool } from './useTool';

export const PAGE_ROWS = 100;

/** "Rows 101–200 of 3,218". */
export function pageStatus(page: RowsPage | undefined) {
  if (!page || !page.total) return 'No rows';
  const last = Math.min(page.total, page.offset + page.rows.length);
  return `Rows ${formatCount(page.offset + 1)}–${formatCount(last)} of ${formatCount(page.total)}`;
}

/** Data quality (FR-038): the rows with missing or invalid cells, page by page. */
export function DataQualityTool() {
  const inputs = useProfileToolStore((state) => state.inputs.data_quality) ?? {};
  const column = (inputs.column as string | undefined) ?? '';
  const offset = (inputs.offset as number | undefined) ?? 0;
  const profile = useLatestProfile();
  const problemColumns = (profile?.columns ?? []).filter(
    (item) => item.missing_count + item.invalid_count > 0,
  );
  const { result, view } = useTool<RowsPage>(
    'rows',
    'profile.rows',
    profile
      ? { filter: { kind: 'problems', column: column || null }, offset, limit: PAGE_ROWS }
      : null,
  );
  const grid = useRef<HTMLDivElement>(null);
  // Pressing the button moves focus off the grid, so remember the last problem visited.
  const lastProblem = useRef<HTMLElement | null>(null);
  const [pendingFocus, setPendingFocus] = useState<'first' | 'last' | null>(null);
  const set = (key: string, value: unknown) =>
    useProfileToolStore.getState().setInput('data_quality', key, value);
  const total = result?.total ?? 0;
  const problemCells = () => [
    ...(grid.current?.querySelectorAll<HTMLElement>('[data-problem]') ?? []),
  ];

  // After a page change caused by Next/Previous problem, focus continues on the new page.
  useEffect(() => {
    if (!pendingFocus || result?.offset !== offset) return;
    const cells = problemCells();
    const target = pendingFocus === 'first' ? cells[0] : cells.at(-1);
    target?.focus();
    lastProblem.current = target ?? null;
    setPendingFocus(null);
  }, [result, offset, pendingFocus]);

  function moveProblem(step: 1 | -1) {
    const cells = problemCells();
    const active = document.activeElement as HTMLElement;
    const at = cells.indexOf(cells.includes(active) ? active : lastProblem.current!);
    const next = at === -1 ? (step === 1 ? 0 : cells.length - 1) : at + step;
    if (cells[next]) {
      lastProblem.current = cells[next];
      return cells[next].focus();
    }
    if (step === 1 && offset + PAGE_ROWS < total) {
      set('offset', offset + PAGE_ROWS);
      setPendingFocus('first');
    }
    if (step === -1 && offset > 0) {
      set('offset', Math.max(0, offset - PAGE_ROWS));
      setPendingFocus('last');
    }
  }

  const toolbar = (
    <>
      <select
        aria-label="Problems in"
        value={column}
        onChange={(event) => {
          set('column', event.target.value);
          set('offset', 0);
        }}
      >
        <option value="">All columns</option>
        {problemColumns.map((item) => (
          <option key={item.name}>{item.name}</option>
        ))}
      </select>
      <button type="button" onClick={() => moveProblem(-1)}>
        Previous problem
      </button>
      <button type="button" onClick={() => moveProblem(1)}>
        Next problem
      </button>
      <span className="tool-spacer" />
      <span role="status">{pageStatus(result)}</span>
      <button
        type="button"
        disabled={offset === 0}
        onClick={() => set('offset', Math.max(0, offset - PAGE_ROWS))}
      >
        Previous page
      </button>
      <button
        type="button"
        disabled={offset + PAGE_ROWS >= total}
        onClick={() => set('offset', offset + PAGE_ROWS)}
      >
        Next page
      </button>
    </>
  );

  return (
    <ToolView title="Data quality" {...view} toolbar={toolbar}>
      {result &&
        (result.total ? (
          <RowsGrid ref={grid} page={result} label="Problem rows" />
        ) : (
          <p className="profile-panel-note">No missing or invalid cells</p>
        ))}
    </ToolView>
  );
}
