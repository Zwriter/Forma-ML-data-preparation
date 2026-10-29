import { afterEach, describe, expect, it } from 'vitest';
import { useDatasetStore } from '../../../src/stores/datasetStore';
import type { Dataset, HistoryMetadata, Preview } from '../../../src/types/dataset';

function file(id: string): { dataset: Dataset; preview: Preview } {
  const column = { name: 'value', type: 'String', nullable: false };
  const dataset: Dataset = {
    dataset_id: id,
    source_path: `${id}.csv`,
    format: 'csv',
    schema: [column],
    columns: 1,
    rows: 1,
    state: 'open',
  };
  return {
    dataset,
    preview: {
      dataset_id: id,
      columns: [column],
      records: [{ value: id }],
      offset: 0,
      limit: 100,
      total_count: 1,
    },
  };
}

function history(id: string, isDirty: boolean): HistoryMetadata {
  return {
    history_id: `history-${id}`,
    dataset_id: id,
    current_index: isDirty ? 1 : 0,
    saved_index: 0,
    is_dirty: isDirty,
    can_undo: isDirty,
    can_redo: false,
  };
}

describe('open dataset tabs', () => {
  afterEach(() => {
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

  it('switches between files while retaining each preview and dirty history', () => {
    const first = file('first');
    const second = file('second');
    const store = useDatasetStore.getState();
    store.setSource(first.dataset, first.preview);
    store.setHistory(history('first', true));
    store.setSource(second.dataset, second.preview);
    store.setHistory(history('second', false));

    useDatasetStore.getState().selectFile('first');
    expect(useDatasetStore.getState().dataset?.dataset_id).toBe('first');
    expect(useDatasetStore.getState().preview?.records).toEqual(first.preview.records);
    expect(useDatasetStore.getState().history?.is_dirty).toBe(true);
    expect(useDatasetStore.getState().openFiles.map((item) => item.id)).toEqual([
      'first',
      'second',
    ]);
  });

  it('activates a remaining tab when the active file closes', () => {
    const first = file('first');
    const second = file('second');
    useDatasetStore.getState().setSource(first.dataset, first.preview);
    useDatasetStore.getState().setSource(second.dataset, second.preview);

    useDatasetStore.getState().closeFile('second');

    expect(useDatasetStore.getState().activeFileId).toBe('first');
    expect(useDatasetStore.getState().dataset?.dataset_id).toBe('first');
    expect(useDatasetStore.getState().openFiles).toHaveLength(1);
  });
});
