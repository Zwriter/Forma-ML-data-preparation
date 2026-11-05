import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';
import { useViewMaskStore } from '../../src/stores/viewMaskStore';
import { useSettingsStore } from '../../src/stores/settingsStore';

const { invoke, listeners, dialogOpen } = vi.hoisted(() => ({
  invoke: vi.fn(),
  dialogOpen: vi.fn(),
  listeners: {} as Record<string, (event: { payload: unknown }) => unknown>,
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: dialogOpen, save: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async (name: string, handler: (event: { payload: unknown }) => unknown) => {
    listeners[name] = handler;
    return () => {
      delete listeners[name];
    };
  }),
}));

const schema = [{ name: 'city', type: 'String', nullable: true }];
const dataset = (id: string) => ({
  dataset_id: id,
  source_path: 'people.csv',
  format: 'csv' as const,
  columns: 1,
  rows: 3,
  state: 'open',
  schema,
});
const history = (index: number) => ({
  history_id: 'history-1',
  dataset_id: index ? 'sorted' : 'source',
  current_index: index,
  saved_index: 0,
  is_dirty: index !== 0,
  can_undo: index !== 0,
  can_redo: index === 0,
});
const preview = (id: string, cities: string[]) => ({
  dataset_id: id,
  columns: schema,
  records: cities.map((city) => ({ city })),
  offset: 0,
  limit: 100,
  total_count: cities.length,
});
const STORED = ['b', 'z', 'a'];
const SORTED = ['z', 'b', 'a'];

function engineReturns(result: unknown) {
  invoke.mockResolvedValueOnce({ id: 'r', status: 'success', result, error: null });
}

async function finish(kind: string, id: string, index: number) {
  await act(async () => {
    await listeners['engine-event']?.({
      payload: {
        job_id: `${kind}-job`,
        kind,
        state: 'completed',
        progress: 1,
        message: 'Completed',
        result: { dataset: dataset(id), history: history(index) },
        error: null,
      },
    });
  });
}

function shownCities() {
  return screen.getAllByRole('gridcell').map((cell) => cell.textContent?.trim());
}

describe('sort as a view', () => {
  afterEach(() => {
    cleanup();
    invoke.mockReset();
    dialogOpen.mockReset();
    useViewMaskStore.setState({ views: {} });
    window.localStorage.clear();
    Object.keys(listeners).forEach((name) => delete listeners[name]);
    useDatasetStore.setState({ dataset: null, preview: null, history: null, openFiles: [] });
    useWorkspaceStore.setState({ busy: false, error: null, history: null, commands: {} });
  });

  it('shows the engine order after a sort and restores stored order on undo and redo', async () => {
    useDatasetStore.getState().setSource(dataset('source'), preview('source', STORED));
    useWorkspaceStore.getState().setHistory(history(0));
    render(<App />);
    await waitFor(() => expect(listeners['engine-event']).toBeDefined());

    engineReturns(preview('sorted', SORTED));
    await finish('sort_rows', 'sorted', 1);
    await waitFor(() => expect(shownCities()).toEqual(SORTED));
    expect(useWorkspaceStore.getState().history?.is_dirty).toBe(true);

    engineReturns(preview('source', STORED));
    await finish('undo', 'source', 0);
    await waitFor(() => expect(shownCities()).toEqual(STORED));
    expect(useWorkspaceStore.getState().history?.is_dirty).toBe(false);

    engineReturns(preview('sorted', SORTED));
    await finish('redo', 'sorted', 1);
    await waitFor(() => expect(shownCities()).toEqual(SORTED));
  });
});

const CITY = [{ column: 'city', direction: 'descending' as const, nulls: 'last' as const }];

describe('remembered sort views', () => {
  afterEach(() => {
    cleanup();
    invoke.mockReset();
    dialogOpen.mockReset();
    useViewMaskStore.setState({ views: {} });
    window.localStorage.clear();
    Object.keys(listeners).forEach((name) => delete listeners[name]);
    useDatasetStore.setState({ dataset: null, preview: null, history: null, openFiles: [] });
    useWorkspaceStore.setState({
      busy: false,
      error: null,
      notification: null,
      history: null,
      commands: {},
    });
  });

  it('opens a file with its remembered sort and reports sort columns that are gone', async () => {
    useViewMaskStore.getState().remember(['people.csv'], CITY);
    engineReturns({ ...dataset('source'), view: [], dropped_columns: ['city'] });
    engineReturns(preview('source', STORED));
    engineReturns(history(0));
    dialogOpen.mockResolvedValueOnce('people.csv');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(3));
    expect(invoke.mock.calls[0][1].request).toMatchObject({
      method: 'dataset.open',
      params: { path: 'people.csv', view: CITY },
    });
    const notice = await screen.findByRole('status');
    expect(notice.textContent).toContain('city');
    expect(useWorkspaceStore.getState().error).toBeNull();
  });

  it('remembers the saved sort for the written copy and its source', async () => {
    useSettingsStore.getState().setSaveBehavior('copy');
    useDatasetStore.getState().setSource(dataset('sorted'), preview('sorted', SORTED));
    useWorkspaceStore.getState().setHistory(history(1));
    render(<App />);
    await waitFor(() => expect(listeners['engine-event']).toBeDefined());

    await act(async () => {
      await listeners['engine-event']?.({
        payload: {
          job_id: 'save-job',
          kind: 'save',
          state: 'completed',
          progress: 1,
          message: 'Completed',
          result: {
            destination: 'C:\\data\\people-copy.csv',
            rewritten: true,
            view: CITY,
            history: { ...history(1), saved_index: 1, is_dirty: false },
          },
          error: null,
        },
      });
    });

    const views = useViewMaskStore.getState();
    expect(views.viewFor('C:/data/people-copy.csv')).toEqual(CITY);
    expect(views.viewFor('people.csv')).toEqual(CITY);
  });
});
