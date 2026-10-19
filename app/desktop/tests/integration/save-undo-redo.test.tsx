import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../../src/App';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { buildSaveCopyDestination } from '../../src/services/saveDestination';

const { invoke, desktopWindow, listeners, saveFileDialog } = vi.hoisted(() => ({
  invoke: vi.fn(),
  saveFileDialog: vi.fn(),
  listeners: {} as Record<string, (event: { payload: unknown }) => unknown>,
  desktopWindow: {
    isMaximized: vi.fn(async () => false),
    onResized: vi.fn(async () => () => undefined),
    onCloseRequested: vi.fn(async () => () => undefined),
    close: vi.fn(async () => undefined),
    destroy: vi.fn(async () => undefined),
    startDragging: vi.fn(async () => undefined),
    toggleMaximize: vi.fn(async () => undefined),
    minimize: vi.fn(async () => undefined),
  },
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => desktopWindow }));
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async (name: string, handler: (event: { payload: unknown }) => unknown) => {
    listeners[name] = handler;
    return () => {
      delete listeners[name];
    };
  }),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: saveFileDialog }));

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
    saveFileDialog.mockReset();
    useSettingsStore.getState().setSaveBehavior('replace');
    Object.keys(listeners).forEach((name) => delete listeners[name]);
    desktopWindow.close.mockClear();
    desktopWindow.destroy.mockClear();
    Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
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
      history: null,
      saveStatus: 'idle',
      commands: {},
    });
  });

  it('shows history buttons on Data tab only', () => {
    useDatasetStore.getState().setSource(dataset, preview);
    useWorkspaceStore.getState().setHistory({
      history_id: 'history-1',
      dataset_id: dataset.dataset_id,
      current_index: 1,
      saved_index: 0,
      is_dirty: true,
      can_undo: true,
      can_redo: true,
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

  it('destroys the window when the close control is clicked', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Close window' }));

    await waitFor(() => expect(desktopWindow.destroy).toHaveBeenCalledOnce());
    expect(desktopWindow.close).not.toHaveBeenCalled();
  });

  it('shows an error if the desktop window cannot close', async () => {
    desktopWindow.destroy.mockRejectedValueOnce(new Error('Window close was denied.'));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Close window' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Window close was denied.');
  });

  it('asks before closing a workspace with unsaved changes', async () => {
    useWorkspaceStore.getState().setHistory({
      history_id: 'history-1',
      dataset_id: dataset.dataset_id,
      current_index: 1,
      saved_index: 0,
      is_dirty: true,
      can_undo: true,
      can_redo: false,
    });
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Close window' }));

    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(desktopWindow.destroy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));

    await waitFor(() => expect(desktopWindow.destroy).toHaveBeenCalledOnce());
  });

  it('closes after saving changes from the close prompt', async () => {
    useDatasetStore.getState().setSource(dataset, preview);
    useWorkspaceStore.getState().setHistory({
      history_id: 'history-1',
      dataset_id: dataset.dataset_id,
      current_index: 1,
      saved_index: 0,
      is_dirty: true,
      can_undo: true,
      can_redo: false,
    });
    invoke.mockResolvedValue({
      id: 'save-1',
      status: 'success',
      result: { job_id: 'save-job', state: 'pending' },
      error: null,
    });
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Close window' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(invoke).toHaveBeenCalledOnce());

    await act(async () => {
      await listeners['engine-event']?.({
        payload: {
          job_id: 'save-job',
          kind: 'save',
          state: 'completed',
          progress: 1,
          message: 'Completed',
          result: {
            history: {
              history_id: 'history-1',
              dataset_id: dataset.dataset_id,
              current_index: 1,
              saved_index: 1,
              is_dirty: false,
              can_undo: true,
              can_redo: false,
            },
          },
          error: null,
        },
      });
    });

    await waitFor(() => expect(desktopWindow.destroy).toHaveBeenCalledOnce());
  });

  it('saves a dated copy beside the source when copy behavior is selected', async () => {
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {}, configurable: true });
    useDatasetStore.getState().setSource(dataset, preview);
    useSettingsStore.getState().setSaveBehavior('copy');
    invoke.mockResolvedValueOnce({
      id: 'save-copy-1',
      status: 'success',
      result: { job_id: 'save-copy-job', state: 'pending' },
      error: null,
    });
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(invoke).toHaveBeenCalledOnce());
    const destination = buildSaveCopyDestination(dataset.source_path, dataset.format);
    expect(saveFileDialog).not.toHaveBeenCalled();
    expect(invoke.mock.calls[0][1].request.params).toEqual({
      dataset_id: 'dataset-1',
      force_overwrite: false,
      destination,
    });
  });

  it('confirms and overwrites an existing copy destination', async () => {
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {}, configurable: true });
    useDatasetStore.getState().setSource(dataset, preview);
    useSettingsStore.getState().setSaveBehavior('copy');
    invoke
      .mockResolvedValueOnce({
        id: 'save-copy-1',
        status: 'error',
        result: null,
        error: { code: 'SAVE_REQUIRED', message: 'This will replace the destination file.' },
      })
      .mockResolvedValueOnce({
        id: 'save-copy-2',
        status: 'success',
        result: { job_id: 'save-copy-job', state: 'pending' },
        error: null,
      });
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const destination = buildSaveCopyDestination(dataset.source_path, dataset.format);
    const confirmation = await screen.findByRole('dialog', { name: 'Replace destination file?' });
    expect(confirmation.textContent).toContain(destination);
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Replace file' }));

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    expect(invoke.mock.calls.map((call) => call[1].request.params)).toEqual([
      { dataset_id: 'dataset-1', force_overwrite: false, destination },
      { dataset_id: 'dataset-1', force_overwrite: true, destination },
    ]);
  });

  it('dispatches Ctrl+S/Z/X outside fields and preserves native editing shortcuts', async () => {
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {}, configurable: true });
    useDatasetStore.getState().setSource(dataset, preview);
    useWorkspaceStore.getState().setHistory({
      history_id: 'history-1',
      dataset_id: dataset.dataset_id,
      current_index: 1,
      saved_index: 0,
      is_dirty: true,
      can_undo: true,
      can_redo: true,
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
      'dataset.save',
      'dataset.undo',
      'dataset.redo',
    ]);
    input.remove();
  });
});
