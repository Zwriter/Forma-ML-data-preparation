import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkflowActions } from '../../src/features/workspace/WorkflowActions';
import { demoProfile } from '../../src/services/demoProfile';
import { demoProfileTool } from '../../src/services/demoProfileTools';
import { useCleaningStore } from '../../src/stores/cleaningStore';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useProfileStore } from '../../src/stores/profileStore';
import { initialToolState, useProfileToolStore } from '../../src/stores/profileToolStore';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';

const eventBus = vi.hoisted(() => ({
  handlers: {} as Record<string, (event: { payload: unknown }) => unknown>,
}));
const invoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async (name: string, handler: (event: { payload: unknown }) => unknown) => {
    eventBus.handlers[name] = handler;
    return () => delete eventBus.handlers[name];
  }),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));

const history = {
  history_id: 'history-1',
  dataset_id: 'dataset-1',
  current_index: 0,
  saved_index: 0,
  is_dirty: false,
  can_undo: false,
  can_redo: false,
  data_version: 'demo-v1',
};

type Request = { method: string; params: Record<string, unknown> };
const reply = (result: unknown) => ({ id: 'r', status: 'success', result, error: null });
const calls = (method: string) =>
  invoke.mock.calls
    .map(([, args]) => args.request as Request)
    .filter((request) => request.method === method);

/** Tool requests are acknowledged as pending; the result arrives as an engine event. */
async function finish(method: string, kind: string, jobId: string) {
  const request = calls(method).at(-1)!;
  const { result } = demoProfileTool(method, request.params);
  await act(async () => {
    await eventBus.handlers['engine-event']?.({
      payload: { job_id: jobId, kind, state: 'completed', result },
    });
  });
}

describe('Profile tools in the workspace', () => {
  beforeEach(() => {
    useDatasetStore.getState().setDataset({
      dataset_id: 'dataset-1',
      source_path: 'source.csv',
      format: 'csv',
      columns: 21,
      rows: 7043,
      state: 'open',
      schema: [],
    });
    useDatasetStore.setState({ history });
    useProfileStore.setState({
      entries: {
        'history-1': {
          profile: { ...demoProfile, history_id: 'history-1' },
          status: 'ready',
          jobId: null,
          progress: null,
          message: null,
          error: null,
        },
      },
    });
    invoke.mockImplementation(async (_: string, args: { request: Request }) =>
      reply({ job_id: `job-${calls(args.request.method).length}`, state: 'pending' }),
    );
  });
  afterEach(() => {
    cleanup();
    invoke.mockReset();
    eventBus.handlers = {};
    useProfileStore.setState({ entries: {} });
    useProfileToolStore.setState(initialToolState());
    useCleaningStore.setState({ drafts: {} });
    useDatasetStore.setState({ dataset: null, history: null });
    useWorkspaceStore.setState({ error: null, notification: null });
  });

  it('shows a tool result that arrives as an engine job event', async () => {
    render(<WorkflowActions activeTab="Profile" />);
    act(() => useProfileToolStore.getState().open('data_quality'));

    await waitFor(() => expect(calls('profile.rows')).toHaveLength(1));
    expect(screen.getByText('Loading results…')).toBeTruthy();
    await finish('profile.rows', 'profile_rows', 'job-1');

    expect(screen.getByRole('table', { name: 'Problem rows' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Rows 1–100 of 3,229');
  });

  it('shows patterns, then anomalies and their outlier rows, from engine events', async () => {
    render(<WorkflowActions activeTab="Profile" />);
    act(() => useProfileToolStore.getState().open('patterns'));
    await waitFor(() => expect(calls('profile.patterns')).toHaveLength(1));
    await finish('profile.patterns', 'profile_patterns', 'job-1');
    expect(screen.getByRole('table', { name: 'Correlations' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Strongest pairs' }).textContent).toContain(
      '0.83 strong',
    );

    act(() => useProfileToolStore.getState().open('anomalies'));
    await waitFor(() => expect(calls('profile.anomalies')).toHaveLength(1));
    await finish('profile.anomalies', 'profile_anomalies', 'job-1');
    fireEvent.click(screen.getByRole('button', { name: 'Show rows for TotalCharges' }));
    await waitFor(() => expect(calls('profile.rows')).toHaveLength(1));
    await finish('profile.rows', 'profile_rows', 'job-1');
    expect(screen.getByRole('table', { name: 'Outlier rows' })).toBeTruthy();
  });

  it('shows nothing for a cancelled anomalies job', async () => {
    render(<WorkflowActions activeTab="Profile" />);
    act(() => useProfileToolStore.getState().open('anomalies'));
    await waitFor(() => expect(calls('profile.anomalies')).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(calls('job.cancel')).toHaveLength(1));
    expect(calls('job.cancel')[0].params).toMatchObject({ job_id: 'job-1' });
    await act(async () => {
      await eventBus.handlers['engine-event']?.({
        payload: { job_id: 'job-1', kind: 'profile_anomalies', state: 'cancelled' },
      });
    });

    expect(screen.queryByRole('table', { name: 'Outliers by column' })).toBeNull();
    expect(screen.queryByText('Loading results…')).toBeNull();
  });

  it('shows a failed tool job in the tool, not as a workspace error', async () => {
    render(<WorkflowActions activeTab="Profile" />);
    act(() => useProfileToolStore.getState().open('duplicates'));
    await waitFor(() => expect(calls('profile.duplicates')).toHaveLength(1));

    await act(async () => {
      await eventBus.handlers['engine-event']?.({
        payload: {
          job_id: 'job-1',
          kind: 'profile_duplicates',
          state: 'failed',
          error: { code: 'INTERNAL_ERROR', message: 'The operation failed.' },
        },
      });
    });

    expect(screen.getByRole('alert').textContent).toContain('The operation failed.');
    expect(useWorkspaceStore.getState().error).toBeNull();
  });

  it('adds a found step to Clean, refreshes automatically, and re-runs the tool', async () => {
    useProfileToolStore.setState({ autoRefresh: true });
    render(<WorkflowActions activeTab="Profile" />);
    act(() => useProfileToolStore.getState().open('duplicates'));
    await waitFor(() => expect(calls('profile.duplicates')).toHaveLength(1));
    await finish('profile.duplicates', 'profile_duplicates', 'job-1');

    fireEvent.click(screen.getByRole('button', { name: 'Add step: Remove duplicates' }));
    expect(useCleaningStore.getState().drafts['dataset-1']).toHaveLength(1);

    // Applying the step elsewhere changes the data: the profile refreshes on its own,
    // and the tool asks again once the new profile is in.
    act(() => useDatasetStore.setState({ history: { ...history, data_version: 'demo-v2' } }));
    await waitFor(() => expect(calls('dataset.profile')).toHaveLength(1));
    expect(screen.getByText('Out of date')).toBeTruthy();
    await act(async () => {
      await eventBus.handlers['engine-event']?.({
        payload: {
          job_id: 'job-1',
          kind: 'profile',
          state: 'completed',
          result: { ...demoProfile, history_id: 'history-1', data_version: 'demo-v2' },
        },
      });
    });
    await waitFor(() => expect(calls('profile.duplicates')).toHaveLength(2));
    expect(calls('profile.duplicates')[1].params.data_version).toBe('demo-v2');
  });
});
