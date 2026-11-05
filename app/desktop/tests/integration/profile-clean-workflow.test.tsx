import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { WorkflowActions } from '../../src/features/workspace/WorkflowActions';
import { CleanTab } from '../../src/features/cleaning/CleanTab';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useCleaningStore } from '../../src/stores/cleaningStore';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';

const eventBus = vi.hoisted(() => ({
  handlers: {} as Record<string, (event: { payload: any }) => unknown>,
}));
const invoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async (name: string, handler: (event: { payload: any }) => unknown) => {
    eventBus.handlers[name] = handler;
    return () => {
      delete eventBus.handlers[name];
    };
  }),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));

const dataset = {
  dataset_id: 'dataset-1',
  source_path: 'source.csv',
  format: 'csv' as const,
  columns: 1,
  rows: 2,
  state: 'open',
  schema: [{ name: 'x', type: 'Int64', nullable: true }],
};

function ipcResult(result: unknown) {
  return { id: 'request-1', status: 'success', result, error: null };
}

function emitJob(job: Record<string, unknown>) {
  return eventBus.handlers['engine-event']?.({ payload: job });
}

const sourcePreview = {
  dataset_id: 'dataset-1',
  columns: dataset.schema,
  records: [{ x: 1 }],
  offset: 0,
  limit: 100,
  total_count: 2,
};

function respond(_command: string, args: { request: { method: string; params: any } }) {
  const { method, params } = args.request;
  if (method === 'cleaning.validate')
    return ipcResult({
      valid: true,
      steps: params.operations.map((_: unknown, index: number) => ({ index, valid: true })),
    });
  if (method === 'cleaning.apply') return ipcResult({ job_id: 'clean-1', state: 'pending' });
  if (method === 'dataset.preview') return ipcResult({ ...sourcePreview, dataset_id: 'derived-1' });
  throw new Error(`Unexpected ${method}`);
}

function completedJob(jobId: string, kind: string, schema: typeof dataset.schema) {
  return {
    job_id: jobId,
    kind,
    state: 'completed',
    progress: 1,
    message: 'Done',
    result: {
      dataset: { ...dataset, dataset_id: `${jobId}-dataset`, schema },
      history: {
        history_id: 'history-1',
        dataset_id: `${jobId}-dataset`,
        current_index: 1,
        saved_index: 0,
        is_dirty: true,
        can_undo: true,
        can_redo: false,
      },
    },
  };
}

function CleanWorkflow() {
  return (
    <>
      <WorkflowActions activeTab="Clean" />
      <CleanTab worksheet={() => null} />
    </>
  );
}

// Clean ribbon commands open step forms through the store.
function addDuplicateStep() {
  act(() => useCleaningStore.getState().openForm('drop_duplicates'));
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Remove duplicate rows' })).getByRole('button', {
      name: 'Add step',
    }),
  );
}

async function applyDraft() {
  fireEvent.click(screen.getByRole('button', { name: 'Apply 1 step' }));
  await screen.findByRole('button', { name: 'Stop' });
}

describe('profile and cleaning workflow', () => {
  afterEach(() => {
    cleanup();
    invoke.mockReset();
    eventBus.handlers = {};
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
    useCleaningStore.setState({
      drafts: {},
      form: null,
      validation: [],
      applyJobId: null,
      finishedJobId: null,
    });
    useWorkspaceStore.setState({
      busy: false,
      error: null,
      history: null,
      saveStatus: 'idle',
      commands: {},
    });
  });

  it('applies profile results without displaying background job status', async () => {
    useDatasetStore.getState().setDataset(dataset);
    let finishProfile: ((value: unknown) => void) | undefined;
    invoke.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishProfile = resolve;
        }),
    );
    render(<WorkflowActions activeTab="Profile" />);

    fireEvent.click(screen.getByText('Profile dataset'));
    expect((screen.getByText('Profile dataset') as HTMLButtonElement).disabled).toBe(true);
    finishProfile?.(
      ipcResult({
        job_id: 'profile-1',
        kind: 'profile',
        state: 'pending',
        progress: null,
        message: 'Queued',
      }),
    );
    expect(screen.queryByRole('region', { name: 'Processing jobs' })).toBeNull();

    emitJob({
      job_id: 'profile-1',
      kind: 'profile',
      state: 'running',
      progress: 0.4,
      message: 'Profiling rows',
    });
    expect(screen.queryByRole('region', { name: 'Processing jobs' })).toBeNull();

    emitJob({
      job_id: 'profile-1',
      kind: 'profile',
      state: 'completed',
      progress: 1,
      message: 'Profile complete',
      result: { row_count: 2, column_count: 1, missing_counts: { x: 0 } },
    });
    await waitFor(() => expect(screen.getByText(/"row_count": 2/)).toBeTruthy());
    expect(screen.queryByRole('region', { name: 'Processing jobs' })).toBeNull();
  });

  it('keeps the draft and source dataset when a cleaning job fails', async () => {
    useDatasetStore.getState().setSource(dataset, sourcePreview);
    invoke.mockImplementation(respond);
    render(<CleanWorkflow />);
    addDuplicateStep();
    await applyDraft();
    const apply = invoke.mock.calls.find((call) => call[1].request.method === 'cleaning.apply');
    expect(apply?.[1].request.params).toEqual({
      dataset_id: 'dataset-1',
      operations: [expect.objectContaining({ type: 'drop_duplicates', order: 0 })],
    });

    await emitJob({
      job_id: 'clean-1',
      kind: 'clean',
      state: 'failed',
      progress: null,
      message: 'Invalid transformation',
      error: { code: 'INVALID_TRANSFORMATION', message: 'Step 1: Invalid transformation.' },
    });

    await waitFor(() =>
      expect(useWorkspaceStore.getState().error).toBe(
        'Cleaning failed: Step 1: Invalid transformation.',
      ),
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Apply 1 step' })).toBeTruthy();
    expect(useDatasetStore.getState().dataset?.dataset_id).toBe('dataset-1');
    expect(useDatasetStore.getState().sourcePreview?.records).toEqual([{ x: 1 }]);
  });

  it('clears the draft once the cleaning job completes', async () => {
    useDatasetStore.getState().setSource(dataset, sourcePreview);
    invoke.mockImplementation(respond);
    render(<CleanWorkflow />);
    addDuplicateStep();
    await applyDraft();

    await emitJob({
      job_id: 'clean-1',
      kind: 'clean',
      state: 'completed',
      progress: 1,
      message: 'Cleaned',
      result: {
        dataset: { ...dataset, dataset_id: 'derived-1' },
        history: {
          history_id: 'history-1',
          dataset_id: 'derived-1',
          current_index: 1,
          saved_index: 0,
          is_dirty: true,
          can_undo: true,
          can_redo: false,
        },
      },
    });

    await waitFor(() => expect(screen.queryByRole('complementary')).toBeNull());
    expect(useCleaningStore.getState().applyJobId).toBeNull();
    expect(useWorkspaceStore.getState().history?.can_undo).toBe(true);
  });

  it('does not render job status or cancellation controls beneath workflow tabs', () => {
    useDatasetStore.getState().setDataset(dataset);
    render(<WorkflowActions activeTab="Clean" />);

    expect(screen.queryByRole('region', { name: 'Processing jobs' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull();
  });

  it('ignores a cleaning job that finished before its acknowledgement arrived', async () => {
    useDatasetStore.getState().setSource(dataset, sourcePreview);
    invoke.mockImplementation(async (command: string, args: any) => {
      // Quick jobs can finish on the engine thread before the apply response is sent.
      if (args.request.method === 'cleaning.apply')
        await emitJob({ ...completedJob('clean-1', 'clean', dataset.schema), job_id: 'clean-1' });
      return respond(command, args);
    });
    render(<CleanWorkflow />);
    addDuplicateStep();
    fireEvent.click(screen.getByRole('button', { name: 'Apply 1 step' }));
    await waitFor(() =>
      expect(invoke.mock.calls.some((call) => call[1].request.method === 'dataset.preview')).toBe(
        true,
      ),
    );
    await act(async () => {});

    expect(useCleaningStore.getState().applyJobId).toBeNull();
    addDuplicateStep();
    expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', false);
  });

  it('keeps a renamed column visible and brings it back on undo', async () => {
    useDatasetStore.getState().setSource(dataset, sourcePreview);
    invoke.mockImplementation(respond);
    render(<CleanWorkflow />);
    const renamed = [{ name: 'y', type: 'Int64', nullable: true }];

    await emitJob(completedJob('clean-1', 'clean', renamed));
    await waitFor(() => expect(useDatasetStore.getState().selectedColumns).toEqual(['y']));
    const previews = () =>
      invoke.mock.calls.filter((call) => call[1].request.method === 'dataset.preview');
    expect(previews().at(-1)?.[1].request.params.columns).toEqual(['y']);

    await emitJob(completedJob('undo-1', 'undo', dataset.schema));
    await waitFor(() => expect(useDatasetStore.getState().selectedColumns).toEqual(['x']));
  });
});
