import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { applyToolEvent, useToolJob } from '../../../src/features/profiling/tools/useToolJob';
import { useDatasetStore } from '../../../src/stores/datasetStore';
import { useProfileStore } from '../../../src/stores/profileStore';
import { initialToolState, useProfileToolStore } from '../../../src/stores/profileToolStore';
import { demoProfile } from '../../../src/services/demoProfile';

const request = vi.hoisted(() => vi.fn());
vi.mock('../../../src/services/ipcClient', () => ({ request }));

const H = 'history-1';
const entry = () => useProfileToolStore.getState().results.patterns;

function openData(version: string, profileVersion: string | null = version) {
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
      data_version: version,
    },
  });
  const profile = profileVersion ? { ...demoProfile, data_version: profileVersion } : null;
  useProfileStore.setState({
    entries: {
      [H]: { profile, status: 'ready', jobId: null, progress: null, message: null, error: null },
    },
  });
}

describe('useToolJob', () => {
  beforeEach(() => openData('v1'));
  afterEach(() => {
    cleanup();
    request.mockReset();
    useProfileStore.setState({ entries: {} });
    useProfileToolStore.setState(initialToolState());
  });

  it('requests the tool for the current data version and records the job', async () => {
    request.mockResolvedValue({ job_id: 'job-1', state: 'pending' });
    renderHook(() => useToolJob('patterns', 'profile.patterns', {}));

    await waitFor(() => expect(entry()?.jobId).toBe('job-1'));
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('profile.patterns', {
      dataset_id: 'dataset-1',
      data_version: 'v1',
    });
    expect(entry()).toMatchObject({ status: 'running', dataVersion: 'v1' });
  });

  it('completes at once when the acknowledgement holds the result (demo mode)', async () => {
    request.mockResolvedValue({ job_id: 'demo', state: 'completed', result: { ok: 1 } });
    const { result } = renderHook(() => useToolJob('patterns', 'profile.patterns', {}));

    await waitFor(() => expect(result.current.entry?.status).toBe('ready'));
    expect(result.current.entry?.result).toEqual({ ok: 1 });
    expect(result.current.stale).toBe(false);
  });

  it('waits for a current profile and shows an older result as out of date', () => {
    useProfileToolStore.getState().start('patterns', 'old', 'v0', 'job-0');
    useProfileToolStore.getState().complete('job-0', { old: true });
    openData('v1', 'v0'); // the profile itself is out of date

    const { result } = renderHook(() => useToolJob('patterns', 'profile.patterns', {}));

    expect(request).not.toHaveBeenCalled();
    expect(result.current.stale).toBe(true);
    expect(result.current.entry?.result).toEqual({ old: true });

    openData('v1', null);
    expect(request).not.toHaveBeenCalled();
  });

  it('does not run without parameters', () => {
    renderHook(() => useToolJob('patterns', 'profile.patterns', null));
    expect(request).not.toHaveBeenCalled();
  });

  it('cancels a running request when its inputs change and ignores its late events', async () => {
    request.mockImplementation(async (method: string, params: { column?: string }) =>
      method === 'job.cancel' ? {} : { job_id: `job-${params.column}`, state: 'pending' },
    );
    const { rerender } = renderHook(
      ({ column }) => useToolJob('patterns', 'profile.patterns', { column }),
      { initialProps: { column: 'a' } },
    );
    await waitFor(() => expect(entry()?.jobId).toBe('job-a'));

    rerender({ column: 'b' });
    await waitFor(() => expect(entry()?.jobId).toBe('job-b'));
    expect(request).toHaveBeenCalledWith('job.cancel', { job_id: 'job-a' });

    act(() =>
      applyToolEvent({ job_id: 'job-a', kind: 'profile_patterns', state: 'completed', result: 1 }),
    );
    expect(entry()).toMatchObject({ status: 'running', jobId: 'job-b' });
  });

  it('cancels a replaced request whose acknowledgement arrives late', async () => {
    let acknowledgeFirst: (ack: unknown) => void = () => {};
    request.mockImplementation((method: string, params: { column?: string }) => {
      if (method === 'job.cancel') return Promise.resolve({});
      if (params.column === 'a')
        return new Promise((resolve) => {
          acknowledgeFirst = resolve;
        });
      return Promise.resolve({ job_id: 'job-b', state: 'pending' });
    });
    const { rerender } = renderHook(
      ({ column }) => useToolJob('patterns', 'profile.patterns', { column }),
      { initialProps: { column: 'a' } },
    );
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    rerender({ column: 'b' });
    await waitFor(() => expect(entry()?.jobId).toBe('job-b'));

    await act(async () => acknowledgeFirst({ job_id: 'job-a', state: 'pending' }));

    expect(request).toHaveBeenCalledWith('job.cancel', { job_id: 'job-a' });
    expect(entry()).toMatchObject({ status: 'running', jobId: 'job-b' });
  });

  it('applies progress and results from engine events', async () => {
    request.mockResolvedValue({ job_id: 'job-1', state: 'pending' });
    renderHook(() => useToolJob('patterns', 'profile.patterns', {}));
    await waitFor(() => expect(entry()?.jobId).toBe('job-1'));

    const event = { job_id: 'job-1', kind: 'profile_patterns' };
    act(() => applyToolEvent({ ...event, state: 'running', progress: 0.4, message: 'Working' }));
    expect(entry()).toMatchObject({ progress: 0.4, message: 'Working' });
    act(() => applyToolEvent({ ...event, state: 'completed', result: { done: true } }));
    expect(entry()).toMatchObject({ status: 'ready', result: { done: true } });
  });

  it('applies an event that arrives before the acknowledgement', async () => {
    let acknowledge: (ack: unknown) => void = () => {};
    request.mockReturnValue(
      new Promise((resolve) => {
        acknowledge = resolve;
      }),
    );
    renderHook(() => useToolJob('patterns', 'profile.patterns', {}));
    await waitFor(() => expect(request).toHaveBeenCalled());

    act(() =>
      applyToolEvent({ job_id: 'job-1', kind: 'profile_patterns', state: 'completed', result: 7 }),
    );
    await act(async () => acknowledge({ job_id: 'job-1', state: 'pending' }));

    expect(entry()).toMatchObject({ status: 'ready', result: 7 });
  });

  it('records request errors and runs again on retry', async () => {
    request.mockRejectedValueOnce(new Error('The data changed.'));
    request.mockResolvedValue({ job_id: 'job-2', state: 'pending' });
    const { result } = renderHook(() => useToolJob('patterns', 'profile.patterns', {}));
    await waitFor(() => expect(entry()?.status).toBe('failed'));
    expect(entry()?.error?.message).toBe('The data changed.');

    await act(() => result.current.retry());
    expect(entry()).toMatchObject({ status: 'running', jobId: 'job-2' });
  });

  it('cancels its running job', async () => {
    request.mockResolvedValue({ job_id: 'job-1', state: 'pending' });
    const { result } = renderHook(() => useToolJob('patterns', 'profile.patterns', {}));
    await waitFor(() => expect(entry()?.jobId).toBe('job-1'));

    await act(() => result.current.cancel());
    expect(request).toHaveBeenLastCalledWith('job.cancel', { job_id: 'job-1' });
  });

  it('ignores events from jobs that are not tools', () => {
    applyToolEvent({ job_id: 'x', kind: 'profile', state: 'completed', result: 1 });
    applyToolEvent({ job_id: 'y', kind: 'profile_report', state: 'completed', result: 1 });
    expect(useProfileToolStore.getState().results).toEqual({});
  });
});
