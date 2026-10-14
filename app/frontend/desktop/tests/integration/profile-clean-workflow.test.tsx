import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkflowActions } from '../../src/features/workspace/WorkflowActions';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useJobStore } from '../../src/stores/jobStore';
import { useTransformationStore } from '../../src/stores/transformationStore';

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
  eventBus.handlers['engine-event']?.({ payload: job });
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
    });
    useJobStore.setState({ jobs: [] });
    useTransformationStore.setState({ operations: [] });
  });

  it('shows visible profile state immediately, progress, completion, and statistics', async () => {
    useDatasetStore.getState().setDataset(dataset);
    let finishProfile: ((value: unknown) => void) | undefined;
    invoke.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishProfile = resolve;
        }),
    );
    render(<WorkflowActions />);

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
    await waitFor(() => expect(screen.getByText(/Profile job queued/)).toBeTruthy());

    emitJob({
      job_id: 'profile-1',
      kind: 'profile',
      state: 'running',
      progress: 0.4,
      message: 'Profiling rows',
    });
    await waitFor(() => expect(screen.getByText('profile: Profiling rows (40%)')).toBeTruthy());
    expect(screen.getByLabelText('profile progress')).toBeTruthy();

    emitJob({
      job_id: 'profile-1',
      kind: 'profile',
      state: 'completed',
      progress: 1,
      message: 'Profile complete',
      result: { row_count: 2, column_count: 1, missing_counts: { x: 0 } },
    });
    await waitFor(() => expect(screen.getByText(/"row_count": 2/)).toBeTruthy());
    expect(screen.getByText('profile: Profile complete (100%)')).toBeTruthy();
  });

  it('shows before and after preview, then reports cleaning failure without losing source dataset', async () => {
    useDatasetStore.getState().setSource(dataset, {
      dataset_id: 'dataset-1',
      columns: dataset.schema,
      records: [{ x: 1 }],
      offset: 0,
      limit: 100,
      total_count: 2,
    });
    invoke.mockResolvedValueOnce(ipcResult({ before: [{ x: 1 }], after: [{ x: 2 }] }));
    render(<WorkflowActions />);

    fireEvent.click(screen.getByText('Add operation'));
    fireEvent.click(screen.getByText('Preview first enabled'));

    await waitFor(() => expect(screen.getByText('Preview ready.')).toBeTruthy());
    expect(screen.getByText('Transformation preview')).toBeTruthy();
    expect(screen.getByText(/"x": 1/)).toBeTruthy();
    expect(screen.getByText(/"x": 2/)).toBeTruthy();
    expect(invoke.mock.calls[0][1].request.params.dataset_id).toBe('dataset-1');

    invoke.mockResolvedValueOnce(
      ipcResult({
        job_id: 'clean-1',
        kind: 'clean',
        state: 'pending',
        progress: null,
        message: 'Queued',
      }),
    );
    fireEvent.click(screen.getByText('Apply operations'));
    await waitFor(() => expect(screen.getByText('Cleaning job queued.')).toBeTruthy());

    emitJob({
      job_id: 'clean-1',
      kind: 'clean',
      state: 'running',
      progress: null,
      message: 'Applying operations',
    });
    await waitFor(() =>
      expect(screen.getByText('clean: Applying operations (progress unknown)')).toBeTruthy(),
    );
    emitJob({
      job_id: 'clean-1',
      kind: 'clean',
      state: 'failed',
      progress: null,
      message: 'Invalid transformation',
    });

    await waitFor(() =>
      expect(screen.getByText('clean: Invalid transformation (progress unknown)')).toBeTruthy(),
    );
    expect(useDatasetStore.getState().dataset?.dataset_id).toBe('dataset-1');
    expect(useDatasetStore.getState().sourcePreview?.records).toEqual([{ x: 1 }]);
  });

  it('requests cancellation for a running job and keeps responsive controls', async () => {
    useDatasetStore.getState().setDataset(dataset);
    useJobStore.getState().add({
      job_id: 'clean-2',
      kind: 'clean',
      state: 'running',
      progress: 0.2,
      message: 'Cleaning rows',
    });
    invoke.mockResolvedValueOnce(ipcResult({ job_id: 'clean-2', state: 'running' }));
    render(<WorkflowActions />);

    expect(screen.getByText('clean: Cleaning rows (20%)')).toBeTruthy();
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Cancellation requested.'),
    );
    expect(invoke.mock.calls[0][1].request).toMatchObject({
      method: 'job.cancel',
      params: { job_id: 'clean-2' },
    });
  });
});
