import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';

const { invoke, desktopWindow } = vi.hoisted(() => ({
  invoke: vi.fn(),
  desktopWindow: {
    isMaximized: vi.fn(async () => false),
    onResized: vi.fn(async () => () => undefined),
    onCloseRequested: vi.fn(async () => () => undefined),
    close: vi.fn(async () => undefined),
    startDragging: vi.fn(async () => undefined),
    toggleMaximize: vi.fn(async () => undefined),
    minimize: vi.fn(async () => undefined),
  },
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => desktopWindow }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => undefined) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));

const dataset = {
  dataset_id: 'dataset-1',
  source_path: 'source.csv',
  format: 'csv' as const,
  columns: 1,
  rows: 1,
  state: 'open',
  schema: [{ name: 'value', type: 'Int64', nullable: true }],
};
const preview = {
  dataset_id: 'dataset-1',
  columns: dataset.schema,
  records: [{ value: 1 }],
  offset: 0,
  limit: 100,
  total_count: 1,
};

describe('workspace Save, Undo, and Redo', () => {
  afterEach(() => {
    cleanup();
    invoke.mockReset();
    Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
    useDatasetStore.setState({
      dataset: null, preview: null, sourceDataset: null, sourcePreview: null,
      history: null, selectedColumns: [],
    });
    useWorkspaceStore.setState({
      busy: false,
      error: null,
      history: null,
      saveStatus: 'idle',
      commands: {},
    });
  });

  it('shows history buttons on Data tab only', () => {
    useDatasetStore.getState().setSource(dataset, preview);
    useWorkspaceStore.getState().setHistory({
      history_id: 'history-1', dataset_id: dataset.dataset_id,
      current_index: 1, saved_index: 0, is_dirty: true, can_undo: true, can_redo: true,
    });
    render(<App />);

    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Clean' }));
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Redo' })).toBeNull();
  });

  it('dispatches Ctrl+S/Z/X outside fields and preserves native editing shortcuts', async () => {
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {}, configurable: true });
    useDatasetStore.getState().setSource(dataset, preview);
    useWorkspaceStore.getState().setHistory({
      history_id: 'history-1', dataset_id: dataset.dataset_id,
      current_index: 1, saved_index: 0, is_dirty: true, can_undo: true, can_redo: true,
    });
    invoke.mockImplementation(async (_command, args) => ({
      id: args.request.id,
      status: 'success',
      result: { job_id: `job-${args.request.method}`, state: 'pending' },
      error: null,
    }));
    render(<App />);

    fireEvent.keyDown(document.body, { key: 's', ctrlKey: true });
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(document.body, { key: 'x', ctrlKey: true });
    const input = document.createElement('input');
    document.body.append(input);
    fireEvent.keyDown(input, { key: 'x', ctrlKey: true });

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(3));
    expect(invoke.mock.calls.map((call) => call[1].request.method)).toEqual([
      'dataset.save', 'dataset.undo', 'dataset.redo',
    ]);
    input.remove();
  });
});
