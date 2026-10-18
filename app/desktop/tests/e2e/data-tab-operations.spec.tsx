import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';
import { useJobStore } from '../../src/stores/jobStore';

const bridge = vi.hoisted(() => ({
  invoke: vi.fn(),
  open: vi.fn(),
  listeners: {} as Record<string, (event: { payload: unknown }) => unknown>,
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => bridge.invoke(...args) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: (...args: unknown[]) => bridge.open(...args),
  save: vi.fn(),
}));
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async (name: string, handler: (event: { payload: unknown }) => unknown) => {
    bridge.listeners[name] = handler;
    return () => {
      delete bridge.listeners[name];
    };
  }),
}));

const source = {
  dataset_id: 'source',
  source_path: 'fixture.csv',
  format: 'csv',
  columns: 4,
  rows: 3,
  state: 'open',
  schema: [
    { name: 'team', type: 'String', nullable: false },
    { name: 'period', type: 'String', nullable: false },
    { name: 'sales', type: 'Int64', nullable: false },
    { name: 'unused', type: 'String', nullable: true },
  ],
};
const pivoted = {
  ...source,
  dataset_id: 'pivoted',
  columns: 3,
  schema: [
    source.schema[0],
    { name: 'period_Q1', type: 'Int64', nullable: true },
    { name: 'period_Q2', type: 'Int64', nullable: true },
  ],
};
const unpivoted = {
  ...source,
  dataset_id: 'unpivoted',
  columns: 3,
  schema: [
    source.schema[0],
    { name: 'period_name', type: 'String', nullable: false },
    { name: 'amount', type: 'Int64', nullable: true },
  ],
};
const grouped = {
  ...source,
  dataset_id: 'grouped',
  columns: 2,
  schema: [source.schema[0], { name: 'sales_total', type: 'Int64', nullable: true }],
};
const datasets = { pivot: pivoted, unpivot: unpivoted, group: grouped };

function success(result: unknown) {
  return { id: 'response', status: 'success', result, error: null };
}

async function complete(jobId: string, dataset: typeof pivoted, index: number) {
  await act(async () => {
    await bridge.listeners['engine-event']?.({
      payload: {
        job_id: jobId,
        kind: index === 0 ? 'pivot' : index === 1 ? 'unpivot' : 'group_by',
        state: 'completed',
        progress: 1,
        message: 'Operation complete',
        result: {
          dataset,
          history: {
            history_id: 'history-source',
            dataset_id: dataset.dataset_id,
            current_index: index + 1,
            saved_index: 0,
            is_dirty: true,
            can_undo: true,
            can_redo: false,
          },
        },
      },
    });
  });
}

describe('Data tab reshape operations', () => {
  afterEach(() => {
    cleanup();
    bridge.invoke.mockReset();
    bridge.open.mockReset();
    bridge.listeners = {};
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
    useJobStore.setState({ jobs: [] });
  });

  it('pivots, unpivots, and groups fixture data through history-backed jobs', async () => {
    let sequence = 0;
    bridge.open.mockResolvedValueOnce('fixture.csv');
    bridge.invoke.mockImplementation(
      async (
        _command: string,
        args: { request: { method: string; params: Record<string, any> } },
      ) => {
        const { method, params } = args.request;
        if (method === 'dataset.open') return success(source);
        if (method === 'dataset.history')
          return success({
            history_id: 'history-source',
            dataset_id: params.dataset_id,
            current_index: 0,
            saved_index: 0,
            is_dirty: false,
            can_undo: false,
            can_redo: false,
          });
        if (method === 'dataset.preview') {
          const dataset =
            Object.values(datasets).find((item) => item.dataset_id === params.dataset_id) ?? source;
          const records =
            dataset.dataset_id === 'pivoted'
              ? [{ team: 'A', period_Q1: 5, period_Q2: 4 }]
              : dataset.dataset_id === 'unpivoted'
                ? [{ team: 'A', period_name: 'period_Q1', amount: 5 }]
                : dataset.dataset_id === 'grouped'
                  ? [{ team: 'A', sales_total: 9 }]
                  : [{ team: 'A', period: 'Q1', sales: 5, unused: null }];
          return success({
            dataset_id: dataset.dataset_id,
            columns: dataset.schema,
            records,
            offset: 0,
            limit: 100,
            total_count: dataset.rows,
          });
        }
        if (method === 'data.apply')
          return success({ job_id: `reshape-${++sequence}`, state: 'pending' });
        throw new Error(`Unexpected IPC method: ${method}`);
      },
    );

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));
    await screen.findByText('Dataset overview');

    fireEvent.click(screen.getByRole('button', { name: 'Pivot' }));
    fireEvent.click(screen.getByText('Apply pivot'));
    await waitFor(() =>
      expect(
        bridge.invoke.mock.calls.filter((call) => call[1].request.method === 'data.apply'),
      ).toHaveLength(1),
    );
    expect(screen.getByText('pivot: Queued (progress unknown)')).toBeTruthy();
    const acknowledgement = await bridge.invoke.mock.results.at(-1)?.value;
    expect(acknowledgement.result).toEqual({ job_id: 'reshape-1', state: 'pending' });
    expect(acknowledgement.result).not.toHaveProperty('records');
    expect(bridge.invoke.mock.calls[3][1].request.params.operation).toMatchObject({
      type: 'pivot',
      parameters: { row_columns: ['team'], category_column: 'period', value_column: 'sales' },
    });
    await complete('reshape-1', pivoted, 0);
    await waitFor(() => expect(useDatasetStore.getState().dataset?.dataset_id).toBe('pivoted'));
    await waitFor(() =>
      expect(useDatasetStore.getState().selectedColumns).toEqual([
        'team',
        'period_Q1',
        'period_Q2',
      ]),
    );
    expect(screen.getAllByText('period_Q1').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Unpivot' }));
    fireEvent.change(screen.getByLabelText('Attribute column name'), {
      target: { value: 'period_name' },
    });
    fireEvent.change(screen.getByLabelText('Value column name'), { target: { value: 'amount' } });
    fireEvent.click(screen.getByText('Apply unpivot'));
    await waitFor(() =>
      expect(
        bridge.invoke.mock.calls.filter((call) => call[1].request.method === 'data.apply'),
      ).toHaveLength(2),
    );
    await complete('reshape-2', unpivoted, 1);
    await waitFor(() => expect(useDatasetStore.getState().dataset?.dataset_id).toBe('unpivoted'));

    fireEvent.click(screen.getByRole('button', { name: 'Group by' }));
    fireEvent.change(screen.getByLabelText('Summary column name 1'), {
      target: { value: 'sales_total' },
    });
    fireEvent.click(screen.getByText('Apply summary'));
    await waitFor(() =>
      expect(
        bridge.invoke.mock.calls.filter((call) => call[1].request.method === 'data.apply'),
      ).toHaveLength(3),
    );
    expect(
      bridge.invoke.mock.calls.filter((call) => call[1].request.method === 'data.apply')[2][1]
        .request.params.operation,
    ).toMatchObject({
      type: 'group_by',
      parameters: {
        group_columns: ['team'],
        aggregations: [{ column: 'amount', function: 'sum', output_name: 'sales_total' }],
      },
    });
    await complete('reshape-3', grouped, 2);
    await waitFor(() => expect(useDatasetStore.getState().dataset?.dataset_id).toBe('grouped'));
    expect(useWorkspaceStore.getState().history?.current_index).toBe(3);
    expect(useWorkspaceStore.getState().history?.is_dirty).toBe(true);
  });
});
