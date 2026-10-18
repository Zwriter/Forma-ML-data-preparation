import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';
import { useJobStore } from '../../src/stores/jobStore';

const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => undefined) }));

describe('filter and sort workflow', () => {
  afterEach(() => {
    cleanup();
    invoke.mockReset();
    useDatasetStore.setState({
      dataset: null,
      preview: null,
      sourceDataset: null,
      sourcePreview: null,
      history: null,
      selectedColumns: [],
    });
    useWorkspaceStore.setState({
      busy: false,
      error: null,
      history: null,
      saveStatus: 'idle',
      commands: {},
    });
    useJobStore.setState({ jobs: [] });
  });

  it('submits typed filter and ordered sort to engine without changing history on acknowledgement', async () => {
    const dataset = {
      dataset_id: 'workflow-dataset',
      source_path: 'records.csv',
      format: 'csv',
      columns: 2,
      rows: 2,
      state: 'open',
      schema: [
        { name: 'name', type: 'String', nullable: true },
        { name: 'amount', type: 'Int64', nullable: false },
      ],
    };
    const preview = {
      dataset_id: dataset.dataset_id,
      columns: dataset.schema,
      records: [
        { name: 'oak', amount: 2 },
        { name: 'pine', amount: 1 },
      ],
      offset: 0,
      limit: 100,
      total_count: 2,
    };
    useDatasetStore.getState().setSource(dataset, preview);
    useWorkspaceStore.getState().setHistory({
      history_id: 'history-1',
      dataset_id: dataset.dataset_id,
      current_index: 0,
      saved_index: 0,
      is_dirty: false,
      can_undo: false,
      can_redo: false,
    });
    invoke
      .mockResolvedValueOnce({
        id: 'filter-ack',
        status: 'success',
        result: { job_id: 'filter-job', state: 'pending' },
        error: null,
      })
      .mockResolvedValueOnce({
        id: 'sort-ack',
        status: 'success',
        result: { job_id: 'sort-job', state: 'pending' },
        error: null,
      });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Filter row' }));
    fireEvent.change(screen.getByLabelText('Filter value 1'), { target: { value: 'oak' } });
    fireEvent.click(screen.getByText('Apply filter'));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(invoke.mock.calls[0][1].request).toMatchObject({
      method: 'data.apply',
      params: { dataset_id: dataset.dataset_id, operation: { type: 'filter_rows' } },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sort' }));
    fireEvent.change(screen.getByLabelText('Sort direction 1'), {
      target: { value: 'descending' },
    });
    fireEvent.click(screen.getByText('Apply sort'));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    expect(invoke.mock.calls[1][1].request.params.operation).toMatchObject({
      type: 'sort_rows',
      parameters: { keys: [{ column: 'name', direction: 'descending', nulls: 'last' }] },
    });
    expect(useWorkspaceStore.getState().history?.is_dirty).toBe(false);
  });
});
