import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  applyExportEvent,
  rejectedDestination,
  useProfileExports,
} from '../../../src/features/profiling/useProfileExports';
import { useDatasetStore } from '../../../src/stores/datasetStore';
import { useProfileStore } from '../../../src/stores/profileStore';
import { useWorkspaceStore } from '../../../src/stores/workspaceStore';

const request = vi.hoisted(() => vi.fn());
const save = vi.hoisted(() => vi.fn());
vi.mock('../../../src/services/ipcClient', () => ({ request }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save }));

describe('rejectedDestination', () => {
  it('names the file after the dataset and date, beside the source', () => {
    expect(rejectedDestination('C:\\data\\telco.csv', new Date(2026, 10, 5))).toBe(
      'C:\\data\\telco_rejected_2026-11-05.csv',
    );
  });
});

describe('useProfileExports', () => {
  beforeEach(() => {
    useDatasetStore.setState({
      dataset: {
        dataset_id: 'dataset-1',
        source_path: 'C:/data/telco.csv',
        format: 'csv',
        columns: 1,
        rows: 1,
        state: 'open',
        schema: [],
      },
      history: {
        history_id: 'history-1',
        dataset_id: 'dataset-1',
        current_index: 0,
        saved_index: 0,
        is_dirty: false,
        can_undo: false,
        can_redo: false,
        data_version: 'v7',
      },
    });
  });
  afterEach(() => {
    request.mockReset();
    save.mockReset();
    useProfileStore.setState({ exportJobId: null });
    useWorkspaceStore.setState({ error: null, notification: null });
  });

  it('asks where to save, then starts the export with the current data version', async () => {
    save.mockResolvedValue('C:/out/bad.parquet');
    request.mockResolvedValue({ job_id: 'export-1', state: 'pending' });
    const { result } = renderHook(() => useProfileExports());

    await act(() => result.current.exportInvalid('amount'));

    expect(save.mock.calls[0][0].defaultPath).toMatch(/telco_rejected_\d{4}-\d\d-\d\d\.csv$/);
    expect(request).toHaveBeenCalledWith('profile.export_invalid', {
      dataset_id: 'dataset-1',
      data_version: 'v7',
      column: 'amount',
      destination: 'C:/out/bad.parquet',
      format: 'parquet',
      // The save dialog already confirmed replacing an existing file.
      force_overwrite: true,
    });
    expect(useProfileStore.getState().exportJobId).toBe('export-1');
  });

  it('does nothing when the save dialog is cancelled', async () => {
    save.mockResolvedValue(null);
    const { result } = renderHook(() => useProfileExports());
    await act(() => result.current.exportInvalid(null));
    expect(request).not.toHaveBeenCalled();
  });

  it('shows a request error and can cancel a running export', async () => {
    save.mockResolvedValue('C:/out/bad.csv');
    request.mockRejectedValueOnce(new Error('The profile is out of date.'));
    const { result } = renderHook(() => useProfileExports());
    await act(() => result.current.exportInvalid(null));
    expect(useWorkspaceStore.getState().error).toBe('The profile is out of date.');

    useProfileStore.setState({ exportJobId: 'export-2' });
    request.mockResolvedValueOnce({});
    await act(() => result.current.cancelExport());
    expect(request).toHaveBeenLastCalledWith('job.cancel', { job_id: 'export-2' });
  });
});

describe('applyExportEvent', () => {
  afterEach(() => {
    useProfileStore.setState({ exportJobId: null });
    useWorkspaceStore.setState({ notification: null });
  });

  it('confirms a finished export with the file and row count', () => {
    useProfileStore.setState({ exportJobId: 'export-1' });
    applyExportEvent({
      job_id: 'export-1',
      kind: 'export_invalid',
      state: 'completed',
      result: { destination: 'C:\\out\\bad.csv', row_count: 2 },
    });
    expect(useProfileStore.getState().exportJobId).toBeNull();
    expect(useWorkspaceStore.getState().notification?.message).toBe(
      'Exported 2 rows with invalid values to bad.csv.',
    );
  });

  it('clears the running export when it fails or is cancelled', () => {
    useProfileStore.setState({ exportJobId: 'export-1' });
    applyExportEvent({ job_id: 'export-1', kind: 'export_invalid', state: 'cancelled' });
    expect(useProfileStore.getState().exportJobId).toBeNull();
    applyExportEvent({ job_id: 'x', kind: 'profile', state: 'completed' });
    expect(useWorkspaceStore.getState().notification?.message).toBe(
      'The invalid-rows export was cancelled; no file was written.',
    );
  });
});

describe('generateReport', () => {
  beforeEach(() => {
    useDatasetStore.setState({
      dataset: {
        dataset_id: 'dataset-1',
        source_path: 'C:/data/telco.csv',
        format: 'csv',
        columns: 1,
        rows: 1,
        state: 'open',
        schema: [],
      },
      history: {
        history_id: 'history-1',
        dataset_id: 'dataset-1',
        current_index: 0,
        saved_index: 0,
        is_dirty: false,
        can_undo: false,
        can_redo: false,
        data_version: 'v7',
      },
    });
    useProfileStore.setState({
      chartColumns: { 'history-1': { distribution: 'MonthlyCharges' } },
      exportJobId: null,
    });
  });
  afterEach(() => {
    request.mockReset();
    save.mockReset();
    useProfileStore.setState({ chartColumns: {}, exportJobId: null });
    useWorkspaceStore.setState({ notification: null });
  });

  it('saves an HTML report featuring the charts picked on the dashboard', async () => {
    save.mockResolvedValue('C:/out/telco.html');
    request.mockResolvedValue({ job_id: 'report-1', state: 'pending' });
    const { result } = renderHook(() => useProfileExports());

    await act(() => result.current.generateReport());

    expect(save.mock.calls[0][0]).toMatchObject({
      defaultPath: expect.stringMatching(/telco-profile-\d{4}-\d\d-\d\d\.html$/),
      filters: [{ name: 'HTML', extensions: ['html'] }],
    });
    expect(request).toHaveBeenCalledWith('profile.report', {
      dataset_id: 'dataset-1',
      data_version: 'v7',
      destination: 'C:/out/telco.html',
      distribution_column: 'MonthlyCharges',
      category_column: null,
      force_overwrite: true,
    });
    expect(useProfileStore.getState().exportJobId).toBe('report-1');
  });

  it('confirms a saved report', () => {
    useProfileStore.setState({ exportJobId: 'report-1' });
    applyExportEvent({
      job_id: 'report-1',
      kind: 'profile_report',
      state: 'completed',
      result: { destination: 'C:/out/telco.html', bytes: 900 },
    });
    expect(useWorkspaceStore.getState().notification?.message).toBe(
      'Saved the profile report to telco.html.',
    );
    expect(useProfileStore.getState().exportJobId).toBeNull();
  });
});
