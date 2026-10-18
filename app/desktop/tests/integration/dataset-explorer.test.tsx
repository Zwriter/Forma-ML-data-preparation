import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';

const invoke = vi.fn();
const dialogOpen = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: dialogOpen, save: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => undefined) }));

const dataset = {
  dataset_id: 'dataset-1',
  source_path: 'source.csv',
  format: 'csv',
  columns: 1,
  rows: 2,
  state: 'open',
  schema: [{ name: 'value', type: 'Int64', nullable: true }],
};
const firstPage = {
  dataset_id: 'dataset-1',
  columns: dataset.schema,
  records: Array.from({ length: 100 }, (_, value) => ({ value })),
  offset: 0,
  limit: 100,
  total_count: 200,
};

describe('dataset explorer workflow', () => {
  afterEach(() => {
    cleanup();
    invoke.mockReset();
    dialogOpen.mockReset();
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
    useWorkspaceStore.setState({
      busy: false,
      error: null,
      notification: null,
      history: null,
      saveStatus: 'idle',
      commands: {},
    });
  });

  it('shows the full ribbon and workspace navigation with the purple accent controls', () => {
    render(<App />);

    for (const action of [
      'Save',
      'Select columns',
      'Filter row',
      'Sort',
      'Group by',
      'Pivot',
      'Unpivot',
    ]) {
      expect(screen.getByText(action)).toBeTruthy();
    }
    expect(screen.getByRole('link', { name: 'Pipelines' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'File' }));
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
  });

  it('opens file, shows schema and bounded records', async () => {
    invoke
      .mockResolvedValueOnce({ id: 'ui-1', status: 'success', result: dataset, error: null })
      .mockResolvedValueOnce({ id: 'ui-2', status: 'success', result: firstPage, error: null })
      .mockResolvedValueOnce({
        id: 'ui-3',
        status: 'success',
        result: {
          history_id: 'history-1',
          dataset_id: dataset.dataset_id,
          current_index: 0,
          saved_index: 0,
          is_dirty: false,
          can_undo: false,
          can_redo: false,
        },
        error: null,
      });

    dialogOpen.mockResolvedValueOnce('source.csv');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));

    await waitFor(() => expect(screen.getByText('Dataset overview')).toBeTruthy());
    expect(screen.getByText('source.csv')).toBeTruthy();
    expect(screen.getAllByText('Int64').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('row')).toHaveLength(102);
    expect(invoke).toHaveBeenCalledTimes(3);
    expect(invoke.mock.calls[1][1].request.params).toMatchObject({ offset: 0, limit: 100 });
  });

  it('shows loading state and keeps open control disabled until request finishes', async () => {
    let finishOpen: ((response: unknown) => void) | undefined;
    invoke.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOpen = resolve;
        }),
    );

    dialogOpen.mockResolvedValueOnce('slow.csv');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));

    await waitFor(() => expect(screen.getByText('Importing…')).toBeTruthy());
    expect((screen.getByText('Importing…') as HTMLButtonElement).disabled).toBe(true);
    finishOpen?.({
      id: 'ui-3',
      status: 'error',
      result: null,
      error: { code: 'FILE_ACCESS_ERROR', message: 'Cannot read selected file.' },
    });

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Cannot read selected file.'),
    );
  });

  it('shows actionable invalid-file error and preserves existing dataset', async () => {
    useDatasetStore.getState().setSource(dataset, firstPage);
    invoke.mockResolvedValueOnce({
      id: 'ui-4',
      status: 'error',
      result: null,
      error: { code: 'INVALID_DATASET', message: 'The file has no columns.' },
    });

    dialogOpen.mockResolvedValueOnce('invalid.csv');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'File' }));
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));

    expect((await screen.findByRole('alert')).textContent).toContain('The file has no columns.');
    fireEvent.click(screen.getByRole('button', { name: 'Back to workspace' }));
    expect(screen.getByText('Dataset overview')).toBeTruthy();
    expect(screen.getByText('source.csv')).toBeTruthy();
    expect(useDatasetStore.getState().dataset?.dataset_id).toBe('dataset-1');
    expect(useDatasetStore.getState().preview?.records).toEqual(firstPage.records);
  });

  it('paginates with bounded requests and preserves source preview', async () => {
    useDatasetStore.getState().setSource(dataset, firstPage);
    invoke.mockResolvedValueOnce({
      id: 'ui-5',
      status: 'success',
      result: { ...firstPage, records: [{ value: 3 }], offset: 100, total_count: 101 },
      error: null,
    });

    render(<App />);
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => expect(screen.getByRole('cell', { name: '3' })).toBeTruthy());
    expect(invoke.mock.calls[0][1].request.params).toMatchObject({
      dataset_id: 'dataset-1',
      offset: 100,
      limit: 100,
    });
    expect(useDatasetStore.getState().sourcePreview?.records).toEqual(firstPage.records);
  });

  it('applies a column projection with a bounded preview and no history change', async () => {
    useDatasetStore.getState().setSource(dataset, firstPage);
    useWorkspaceStore.getState().setHistory({
      history_id: 'history-1',
      dataset_id: dataset.dataset_id,
      current_index: 0,
      saved_index: 0,
      is_dirty: false,
      can_undo: false,
      can_redo: false,
    });
    invoke.mockResolvedValueOnce({
      id: 'projection-1',
      status: 'success',
      result: { ...firstPage, records: [{ value: 1 }] },
      error: null,
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Select columns' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply columns' }));

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(invoke.mock.calls[0][1].request.params).toMatchObject({
      dataset_id: 'dataset-1',
      offset: 0,
      limit: 100,
      columns: ['value'],
    });
    expect(useWorkspaceStore.getState().history?.is_dirty).toBe(false);
    expect(useWorkspaceStore.getState().history?.current_index).toBe(0);
  });

  it('submits filter and sort through data.apply without changing history before commit', async () => {
    useDatasetStore.getState().setSource(dataset, firstPage);
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
        id: 'filter-job',
        status: 'success',
        result: { job_id: 'job-1', state: 'pending' },
        error: null,
      })
      .mockResolvedValueOnce({
        id: 'sort-job',
        status: 'success',
        result: { job_id: 'job-2', state: 'pending' },
        error: null,
      });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Filter row' }));
    fireEvent.change(screen.getByLabelText('Filter value 1'), { target: { value: '4' } });
    fireEvent.click(screen.getByText('Apply filter'));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(invoke.mock.calls[0][1].request.method).toBe('data.apply');
    expect(invoke.mock.calls[0][1].request.params.operation.type).toBe('filter_rows');
    expect(useWorkspaceStore.getState().history?.is_dirty).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Sort' }));
    fireEvent.click(screen.getByText('Apply sort'));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    expect(invoke.mock.calls[1][1].request.method).toBe('data.apply');
    expect(invoke.mock.calls[1][1].request.params.operation.type).toBe('sort_rows');
  });
});
