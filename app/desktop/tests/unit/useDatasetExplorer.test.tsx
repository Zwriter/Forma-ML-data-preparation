import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDatasetExplorer } from '../../src/features/explorer/useDatasetExplorer';
import { useDatasetStore } from '../../src/stores/datasetStore';
import type { Dataset, Preview } from '../../src/types/dataset';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));

const schema = [
  { name: 'id', type: 'Int64', nullable: false },
  { name: 'name', type: 'Utf8', nullable: true },
];
const dataset: Dataset = {
  dataset_id: 'dataset-1',
  source_path: 'source.csv',
  format: 'csv',
  columns: 2,
  rows: 20,
  state: 'open',
  schema,
};
const preview = (ids: number[], offset = 0): Preview => ({
  dataset_id: dataset.dataset_id,
  columns: schema,
  records: ids.map((id) => ({ id, name: `row ${id}` })),
  offset,
  limit: 10,
  total_count: ids.length,
});

function ExplorerProbe() {
  const { page } = useDatasetExplorer();
  const current = useDatasetStore((state) => state.preview);
  return (
    <>
      <button onClick={() => void page(10, 10)}>Load next page</button>
      <output data-testid="preview-ids">
        {JSON.stringify(current?.records.map((row) => row.id))}
      </output>
    </>
  );
}

describe('dataset explorer preview requests', () => {
  afterEach(() => {
    invoke.mockReset();
    useDatasetStore.setState({
      dataset: null,
      preview: null,
      sourceDataset: null,
      sourcePreview: null,
      history: null,
      selectedColumns: [],
      openFiles: [],
      activeFileId: null,
    });
  });

  it('does not let an old page request overwrite the preview restored by undo', async () => {
    let finishOldPage!: (value: Preview) => void;
    invoke.mockReturnValueOnce(
      new Promise((resolve) => {
        finishOldPage = (value) => resolve({ status: 'success', result: value, error: null });
      }),
    );
    useDatasetStore.getState().setSource(dataset, preview([1, 2, 3]));
    render(<ExplorerProbe />);

    act(() => screen.getByRole('button', { name: 'Load next page' }).click());
    const restoredPreview = preview(Array.from({ length: 10 }, (_, index) => index + 1));
    const history = {
      history_id: 'history-1',
      dataset_id: dataset.dataset_id,
      current_index: 0,
      saved_index: 0,
      is_dirty: false,
      can_undo: false,
      can_redo: true,
    };
    act(() =>
      useDatasetStore.getState().applyResult({ ...dataset, rows: 20 }, history, restoredPreview),
    );

    await act(async () => finishOldPage(preview([11, 12, 13], 10)));

    expect(screen.getByTestId('preview-ids').textContent).toBe(
      JSON.stringify(restoredPreview.records.map((row) => row.id)),
    );
  });
});
