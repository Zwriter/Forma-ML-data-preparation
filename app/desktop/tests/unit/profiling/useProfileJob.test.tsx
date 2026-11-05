import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { applyProfileEvent, useProfileJob } from '../../../src/features/profiling/useProfileJob';
import { useDatasetStore } from '../../../src/stores/datasetStore';
import { useProfileStore } from '../../../src/stores/profileStore';
import { demoProfile } from '../../../src/services/demoProfile';

const request = vi.hoisted(() => vi.fn());
vi.mock('../../../src/services/ipcClient', () => ({ request }));

const H = 'history-1';
const entry = () => useProfileStore.getState().entries[H];

describe('useProfileJob', () => {
  beforeEach(() => {
    useDatasetStore.setState({
      dataset: {
        dataset_id: 'dataset-1',
        source_path: 'source.csv',
        format: 'csv',
        columns: 1,
        rows: 1,
        state: 'open',
        schema: [],
      },
      history: {
        history_id: H,
        dataset_id: 'dataset-1',
        current_index: 0,
        saved_index: 0,
        is_dirty: false,
        can_undo: false,
        can_redo: false,
        data_version: 'v1',
      },
    });
  });
  afterEach(() => {
    request.mockReset();
    useProfileStore.setState({ entries: {} });
  });

  it('starts a profile job for the current dataset and records it', async () => {
    request.mockResolvedValue({ job_id: 'job-1', state: 'pending' });
    const { result } = renderHook(() => useProfileJob());

    await act(() => result.current.run());

    expect(request).toHaveBeenCalledWith('dataset.profile', { dataset_id: 'dataset-1' });
    expect(entry()).toMatchObject({ status: 'running', jobId: 'job-1' });
  });

  it('completes at once when the ack already holds the result (demo mode)', async () => {
    request.mockResolvedValue({ job_id: 'demo', state: 'completed', result: demoProfile });
    const { result } = renderHook(() => useProfileJob());

    await act(() => result.current.run());

    expect(entry()).toMatchObject({ status: 'ready', profile: demoProfile });
  });

  it('records a failed request instead of throwing', async () => {
    request.mockRejectedValue(new Error('Engine is not running.'));
    const { result } = renderHook(() => useProfileJob());

    await act(() => result.current.run());

    expect(entry()).toMatchObject({
      status: 'failed',
      error: { message: 'Engine is not running.' },
    });
  });

  it('applies an event that arrives before the request is acknowledged', async () => {
    let acknowledge: (ack: unknown) => void = () => undefined;
    request.mockReturnValue(new Promise((resolve) => (acknowledge = resolve)));
    const { result } = renderHook(() => useProfileJob());

    const running = act(() => result.current.run());
    applyProfileEvent({
      job_id: 'job-1',
      kind: 'profile',
      state: 'completed',
      result: demoProfile,
    });
    acknowledge({ job_id: 'job-1', state: 'pending' });
    await running;

    expect(entry()).toMatchObject({ status: 'ready', profile: demoProfile });
  });

  it('cancels the running job', async () => {
    request.mockResolvedValueOnce({ job_id: 'job-1', state: 'pending' });
    const { result } = renderHook(() => useProfileJob());
    await act(() => result.current.run());

    request.mockResolvedValueOnce({ job_id: 'job-1', cancel_requested: true });
    await act(() => result.current.cancel());

    expect(request).toHaveBeenLastCalledWith('job.cancel', { job_id: 'job-1' });
  });
});

describe('applyProfileEvent', () => {
  afterEach(() => useProfileStore.setState({ entries: {} }));

  it('routes profile job events into the store and ignores other kinds', () => {
    useProfileStore.getState().start(H, 'job-1');
    const job = { job_id: 'job-1', kind: 'profile', progress: 0.3, message: 'Finding duplicates' };

    applyProfileEvent({ ...job, kind: 'export', state: 'running' });
    expect(entry().progress).toBe(0);

    applyProfileEvent({ ...job, state: 'running' });
    expect(entry()).toMatchObject({ progress: 0.3, message: 'Finding duplicates' });

    applyProfileEvent({ ...job, state: 'completed', result: demoProfile });
    expect(entry()).toMatchObject({ status: 'ready', profile: demoProfile });
  });

  it('records failures and cancellations', () => {
    useProfileStore.getState().start(H, 'job-1');
    const error = { code: 'INTERNAL_ERROR', message: 'The operation failed.' };
    applyProfileEvent({ job_id: 'job-1', kind: 'profile', state: 'failed', error });
    expect(entry()).toMatchObject({ status: 'failed', error });

    useProfileStore.getState().start(H, 'job-2');
    applyProfileEvent({ job_id: 'job-2', kind: 'profile', state: 'cancelled' });
    expect(entry().status).toBe('idle');
  });
});
