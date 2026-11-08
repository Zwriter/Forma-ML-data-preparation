import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useAutoRefresh } from '../../../src/features/profiling/useProfileJob';
import { useDatasetStore } from '../../../src/stores/datasetStore';
import { useProfileStore, type ProfileEntry } from '../../../src/stores/profileStore';
import { initialToolState, useProfileToolStore } from '../../../src/stores/profileToolStore';
import { demoProfile } from '../../../src/services/demoProfile';

const request = vi.hoisted(() => vi.fn());
vi.mock('../../../src/services/ipcClient', () => ({ request }));

const H = 'history-1';

function setData(version: string, entry: Partial<ProfileEntry> = {}) {
  useDatasetStore.setState({
    dataset: {
      dataset_id: 'dataset-1',
      source_path: 'a.csv',
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
  useProfileStore.setState((state) => ({
    entries: {
      [H]: {
        profile: { ...demoProfile, data_version: 'v1' },
        status: 'ready',
        jobId: null,
        progress: null,
        message: null,
        error: null,
        requestedVersion: 'v1',
        ...state.entries[H],
        ...entry,
      },
    },
  }));
}

const profileRequests = () => request.mock.calls.filter(([method]) => method === 'dataset.profile');

describe('useAutoRefresh', () => {
  afterEach(() => {
    cleanup();
    request.mockReset();
    useProfileStore.setState({ entries: {} });
    useProfileToolStore.setState(initialToolState());
  });

  it('re-profiles once when the data changes and the switch is on', async () => {
    request.mockResolvedValue({ job_id: 'job-2', state: 'pending' });
    useProfileToolStore.setState({ autoRefresh: true });
    setData('v1');
    const { rerender } = renderHook(() => useAutoRefresh());
    expect(profileRequests()).toHaveLength(0); // the profile is current

    await act(async () => setData('v2'));
    rerender();
    expect(profileRequests()).toHaveLength(1);
    expect(useProfileStore.getState().entries[H].requestedVersion).toBe('v2');
  });

  it('runs on return to the tab when the data changed while away', async () => {
    request.mockResolvedValue({ job_id: 'job-2', state: 'pending' });
    useProfileToolStore.setState({ autoRefresh: true });
    setData('v2');
    await act(async () => renderHook(() => useAutoRefresh()));
    expect(profileRequests()).toHaveLength(1);
  });

  it('does nothing when the switch is off', async () => {
    setData('v2');
    await act(async () => renderHook(() => useAutoRefresh()));
    expect(profileRequests()).toHaveLength(0);
  });

  it('never asks twice for one version, even after a failure or cancel', async () => {
    useProfileToolStore.setState({ autoRefresh: true });
    setData('v2', { status: 'failed', requestedVersion: 'v2' });
    await act(async () => renderHook(() => useAutoRefresh()));
    expect(profileRequests()).toHaveLength(0);
  });

  it('waits for a running profile', async () => {
    useProfileToolStore.setState({ autoRefresh: true });
    setData('v2', { status: 'running', jobId: 'job-1', requestedVersion: 'v1' });
    await act(async () => renderHook(() => useAutoRefresh()));
    expect(profileRequests()).toHaveLength(0);
  });
});
