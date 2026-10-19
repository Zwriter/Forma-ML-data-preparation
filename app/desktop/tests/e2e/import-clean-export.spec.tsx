import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../../src/App';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useExportStore } from '../../src/stores/exportStore';
import { useTransformationStore } from '../../src/stores/transformationStore';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';

const bridge = vi.hoisted(() => ({
  invoke: vi.fn(),
  dialog: vi.fn(),
  listeners: {} as Record<string, (event: { payload: unknown }) => unknown>,
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => bridge.invoke(...args) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: (...args: unknown[]) => bridge.dialog(...args),
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
  dataset_id: 'source-1',
  source_path: 'source.csv',
  format: 'csv' as const,
  columns: 1,
  rows: 2,
  state: 'open',
  schema: [{ name: 'x', type: 'Int64', nullable: true }],
};
const derived = { ...source, dataset_id: 'derived-1', source_path: 'derived://cleaned', rows: 1 };
const csvOutput = { ...derived, dataset_id: 'csv-output-1', source_path: 'cleaned.csv' };
const parquetOutput = {
  ...csvOutput,
  dataset_id: 'parquet-output-1',
  source_path: 'cleaned.parquet',
  format: 'parquet' as const,
};
const previews: Record<string, Array<Record<string, unknown>>> = {
  'source-1': [{ x: 1 }, { x: 1 }],
  'derived-1': [{ x: 1 }],
  'csv-output-1': [{ x: 1 }],
  'parquet-output-1': [{ x: 1 }],
};

function success(result: unknown, id = 'response') {
  return { id, status: 'success', result, error: null };
}

async function emit(event: Record<string, unknown>) {
  await act(async () => {
    await bridge.listeners['engine-event']?.({ payload: event });
  });
}

function importFile(path: string) {
  bridge.dialog.mockResolvedValueOnce(path);
  const importButton = screen.queryByRole('button', { name: 'Import file' });
  if (!importButton) fireEvent.click(screen.getByRole('button', { name: 'File' }));
  fireEvent.click(screen.getByRole('button', { name: 'Import file' }));
}

describe('import-clean-export desktop flow', () => {
  afterEach(() => {
    cleanup();
    bridge.invoke.mockReset();
    bridge.dialog.mockReset();
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
    useExportStore.setState({ destination: '', overwrite: false });
    useTransformationStore.setState({ operations: [] });
    useWorkspaceStore.setState({
      busy: false,
      error: null,
      history: null,
      saveStatus: 'idle',
      commands: {},
    });
  });

  it('cleans and reopens files, preserves source, and keeps background jobs out of the workspace', async () => {
    let jobSequence = 0;
    bridge.invoke.mockImplementation(
      async (
        _command: string,
        args: { request: { method: string; params: Record<string, any> } },
      ) => {
        const { method, params } = args.request;
        if (method === 'dataset.open') {
          const file =
            params.path === 'source.csv'
              ? source
              : params.path === 'cleaned.csv'
                ? csvOutput
                : parquetOutput;
          return success(file, `open-${file.dataset_id}`);
        }
        if (method === 'dataset.history')
          return success({
            history_id: `history-${params.dataset_id}`,
            dataset_id: params.dataset_id,
            current_index: 0,
            saved_index: 0,
            is_dirty: false,
            can_undo: false,
            can_redo: false,
          });
        if (method === 'dataset.preview') {
          const rows = previews[params.dataset_id] ?? [];
          return success({
            dataset_id: params.dataset_id,
            columns: source.schema,
            records: rows,
            offset: params.offset,
            limit: params.limit,
            total_count: rows.length,
          });
        }
        if (method === 'cleaning.preview' && params.operation.type === 'convert_type') {
          return {
            id: 'invalid-conversion',
            status: 'error',
            result: null,
            error: { code: 'INVALID_TRANSFORMATION', message: 'Invalid value in column x.' },
          };
        }
        if (method === 'cleaning.preview')
          return success({ before: previews['source-1'], after: previews['derived-1'] });
        if (method === 'cleaning.apply') return success({ job_id: 'clean-1', state: 'pending' });
        if (
          method === 'export.csv' &&
          params.destination === 'existing.csv' &&
          !params.force_overwrite
        ) {
          return {
            id: 'overwrite-rejected',
            status: 'error',
            result: null,
            error: {
              code: 'FILE_ACCESS_ERROR',
              message: 'Destination exists. Confirm replacement before export.',
            },
          };
        }
        if (method === 'export.csv' || method === 'export.parquet') {
          return success({ job_id: `export-${++jobSequence}`, state: 'pending' });
        }
        throw new Error(`Unexpected IPC method: ${method}`);
      },
    );

    render(<App />);
    importFile('source.csv');
    await screen.findByText('Dataset overview');
    expect(screen.getAllByRole('row')).toHaveLength(4);
    const sourceSnapshot = useDatasetStore.getState().sourceDataset;

    fireEvent.click(screen.getByRole('link', { name: 'Clean' }));
    fireEvent.click(screen.getByText('Add operation'));
    fireEvent.click(screen.getByText('Preview first enabled'));
    await screen.findByText('Transformation preview');
    const comparison = screen.getByRole('heading', {
      name: 'Transformation preview',
    }).parentElement;
    expect(within(comparison as HTMLElement).getAllByText(/"x": 1/)).toHaveLength(2);

    fireEvent.click(screen.getByText('Apply operations'));
    await waitFor(() =>
      expect(
        bridge.invoke.mock.calls.some((call) => call[1].request.method === 'cleaning.apply'),
      ).toBe(true),
    );
    await emit({
      job_id: 'clean-1',
      kind: 'clean',
      state: 'completed',
      progress: 1,
      message: 'Cleaned',
      result: {
        dataset: derived,
        history: {
          history_id: 'history-source-1',
          dataset_id: derived.dataset_id,
          current_index: 1,
          saved_index: 0,
          is_dirty: true,
          can_undo: true,
          can_redo: false,
        },
      },
    });
    await waitFor(() => expect(useDatasetStore.getState().dataset?.dataset_id).toBe('derived-1'));
    expect(useDatasetStore.getState().sourceDataset).toEqual(sourceSnapshot);
    expect(useDatasetStore.getState().sourceDataset?.source_path).toBe('source.csv');

    fireEvent.click(screen.getByRole('link', { name: 'Export' }));
    fireEvent.change(screen.getByLabelText('Destination path'), {
      target: { value: 'cleaned.csv' },
    });
    fireEvent.click(screen.getByText('Export CSV'));
    await waitFor(() =>
      expect(
        bridge.invoke.mock.calls.some(
          (call) =>
            call[1].request.method === 'export.csv' &&
            call[1].request.params.destination === 'cleaned.csv',
        ),
      ).toBe(true),
    );
    expect(screen.queryByRole('region', { name: 'Processing jobs' })).toBeNull();
    expect(
      bridge.invoke.mock.calls.find((call) => call[1].request.method === 'export.csv')?.[1].request
        .params,
    ).toMatchObject({
      dataset_id: 'derived-1',
      destination: 'cleaned.csv',
      force_overwrite: false,
    });
    await emit({
      job_id: 'export-1',
      kind: 'export',
      state: 'completed',
      progress: 1,
      message: 'CSV export complete',
      result: {
        destination: 'cleaned.csv',
        format: 'csv',
        row_count: 1,
        schema: derived.schema,
        validated: true,
      },
    });
    importFile('cleaned.csv');
    await waitFor(() =>
      expect(useDatasetStore.getState().dataset?.dataset_id).toBe('csv-output-1'),
    );
    expect(screen.getAllByRole('row')).toHaveLength(3);

    fireEvent.click(screen.getByRole('link', { name: 'Export' }));
    fireEvent.change(screen.getByLabelText('Destination path'), {
      target: { value: 'cleaned.parquet' },
    });
    fireEvent.click(screen.getByText('Export Parquet'));
    await waitFor(() =>
      expect(
        bridge.invoke.mock.calls.some(
          (call) =>
            call[1].request.method === 'export.parquet' &&
            call[1].request.params.destination === 'cleaned.parquet',
        ),
      ).toBe(true),
    );
    expect(
      bridge.invoke.mock.calls.find((call) => call[1].request.method === 'export.parquet')?.[1]
        .request.params,
    ).toMatchObject({
      dataset_id: 'csv-output-1',
      destination: 'cleaned.parquet',
      force_overwrite: false,
    });
    await emit({
      job_id: 'export-2',
      kind: 'export',
      state: 'completed',
      progress: 1,
      message: 'Parquet export complete',
      result: {
        destination: 'cleaned.parquet',
        format: 'parquet',
        row_count: 1,
        schema: derived.schema,
        validated: true,
      },
    });
    importFile('cleaned.parquet');
    await waitFor(() =>
      expect(useDatasetStore.getState().dataset?.dataset_id).toBe('parquet-output-1'),
    );
    expect(useDatasetStore.getState().preview?.records).toEqual([{ x: 1 }]);

    fireEvent.click(screen.getByRole('link', { name: 'Clean' }));
    fireEvent.click(screen.getByLabelText('Remove operation 1'));
    fireEvent.change(screen.getByLabelText('Operation'), { target: { value: 'convert_type' } });
    fireEvent.change(screen.getByLabelText('Parameters (JSON)'), {
      target: { value: '{"column":"x","to":"integer"}' },
    });
    fireEvent.click(screen.getByText('Add operation'));
    fireEvent.click(screen.getByText('Preview first enabled'));
    expect(await screen.findByText('Invalid value in column x.')).toBeTruthy();
    expect(useDatasetStore.getState().dataset?.dataset_id).toBe('parquet-output-1');

    fireEvent.click(screen.getByRole('link', { name: 'Export' }));
    fireEvent.change(screen.getByLabelText('Destination path'), {
      target: { value: 'existing.csv' },
    });
    fireEvent.click(screen.getByText('Export CSV'));
    expect(
      await screen.findByText('Destination exists. Confirm replacement before export.'),
    ).toBeTruthy();
    const rejectedExport = bridge.invoke.mock.calls.find(
      (call) => call[1].request.params.destination === 'existing.csv',
    );
    expect(rejectedExport?.[1].request.params.force_overwrite).toBe(false);

    fireEvent.change(screen.getByLabelText('Destination path'), {
      target: { value: 'failed.csv' },
    });
    fireEvent.click(screen.getByText('Export CSV'));
    await waitFor(() =>
      expect(
        bridge.invoke.mock.calls.some(
          (call) =>
            call[1].request.method === 'export.csv' &&
            call[1].request.params.destination === 'failed.csv',
        ),
      ).toBe(true),
    );
    expect(screen.queryByRole('region', { name: 'Processing jobs' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    await emit({
      job_id: 'export-3',
      kind: 'export',
      state: 'failed',
      progress: null,
      message: 'Export failed',
      error: { code: 'EXPORT_FAILED', message: 'Could not write the output file.' },
    });
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Export failed: Could not write the output file.',
    );
  });
});
