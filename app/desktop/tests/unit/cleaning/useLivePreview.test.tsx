import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useLivePreview } from '../../../src/features/cleaning/useLivePreview';
import { useCleaningStore } from '../../../src/stores/cleaningStore';
import { useDatasetStore } from '../../../src/stores/datasetStore';
import type { CleaningPreview, CleaningStep } from '../../../src/types/cleaning';

const request = vi.hoisted(() => vi.fn());
vi.mock('../../../src/services/ipcClient', () => ({ request }));

const column = { name: 'x', type: 'Int64', nullable: true };
const dataset = {
  dataset_id: 'dataset-1',
  source_path: 'source.csv',
  format: 'csv' as const,
  columns: 1,
  rows: 300,
  state: 'open',
  schema: [column],
};

function result(total: number): CleaningPreview {
  return {
    columns: [{ ...column, origin: 'x' }],
    rows: [],
    changed_cells: [],
    offset: 0,
    limit: 50,
    total_count: total,
    summary: {
      rows_before: total,
      rows_after: total,
      rows_removed: 0,
      values_changed: 0,
      columns_added: [],
      columns_removed: [],
      columns_renamed: [],
    },
  };
}

const step = (id: string, enabled = true): CleaningStep => ({
  id,
  type: 'drop_duplicates',
  parameters: {},
  enabled,
});

async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });
}

describe('live worksheet preview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useDatasetStore.setState({
      dataset,
      preview: {
        dataset_id: 'dataset-1',
        columns: [column],
        records: [],
        offset: 50,
        limit: 50,
        total_count: 300,
      },
      selectedColumns: ['x'],
      search: 'ana',
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    request.mockReset();
    useCleaningStore.setState({ preview: null, previewStatus: 'idle', previewError: '' });
  });

  it('does nothing while no step is enabled', async () => {
    renderHook(() => useLivePreview([step('a', false)]));
    await settle();
    expect(request).not.toHaveBeenCalled();
    expect(useCleaningStore.getState().preview).toBeNull();
  });

  it('debounces draft changes and requests the page on screen', async () => {
    request.mockResolvedValue(result(300));
    const { rerender } = renderHook(({ steps }) => useLivePreview(steps), {
      initialProps: { steps: [step('a')] },
    });
    expect(useCleaningStore.getState().previewStatus).toBe('updating');
    rerender({ steps: [step('a'), step('b')] });
    await settle();
    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith('cleaning.preview', {
      dataset_id: 'dataset-1',
      operations: [
        expect.objectContaining({ operation_id: 'a' }),
        expect.objectContaining({ operation_id: 'b' }),
      ],
      offset: 50,
      limit: 50,
      columns: ['x'],
      search: 'ana',
    });
    expect(useCleaningStore.getState()).toMatchObject({
      preview: result(300),
      previewStatus: 'idle',
    });
  });

  it('keeps only the result of the latest draft', async () => {
    let finishFirst: (value: CleaningPreview) => void = () => undefined;
    request
      .mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)))
      .mockResolvedValueOnce(result(2));
    const { rerender } = renderHook(({ steps }) => useLivePreview(steps), {
      initialProps: { steps: [step('a')] },
    });
    await settle();
    rerender({ steps: [step('b')] });
    await settle();
    await act(async () => finishFirst(result(1)));
    expect(useCleaningStore.getState().preview?.total_count).toBe(2);
  });

  it('reports a failing draft and clears the previous result', async () => {
    useCleaningStore.setState({ preview: result(9) });
    request.mockRejectedValue(new Error('Step 1: Select an existing column.'));
    renderHook(() => useLivePreview([step('a')]));
    await settle();
    expect(useCleaningStore.getState()).toMatchObject({
      preview: null,
      previewStatus: 'error',
      previewError: 'Step 1: Select an existing column.',
    });
  });
});
