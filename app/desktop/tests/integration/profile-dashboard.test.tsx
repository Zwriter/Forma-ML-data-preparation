import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { WorkflowActions } from '../../src/features/workspace/WorkflowActions';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useProfileStore } from '../../src/stores/profileStore';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';
import { demoProfile } from '../../src/services/demoProfile';

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

const profileCalls = () =>
  invoke.mock.calls.filter(([, args]) => args.request.method === 'dataset.profile');

function reply(result: unknown) {
  return { id: 'r', status: 'success', result, error: null };
}

function emit(job: Record<string, unknown>) {
  return act(async () => {
    await eventBus.handlers['engine-event']?.({ payload: { kind: 'profile', ...job } });
  });
}

function renderTab(tab = 'Profile') {
  return render(
    <StrictMode>
      <WorkflowActions activeTab={tab} />
    </StrictMode>,
  );
}

describe('Profile dashboard', () => {
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
    invoke.mockImplementation(async (_: string, args: { request: { method: string } }) =>
      reply(
        args.request.method === 'dataset.profile'
          ? { job_id: 'profile-1', state: 'pending' }
          : { job_id: 'profile-1', cancel_requested: true },
      ),
    );
  });
  afterEach(() => {
    cleanup();
    invoke.mockReset();
    eventBus.handlers = {};
    useProfileStore.setState({ entries: {} });
    useDatasetStore.setState({ dataset: null, history: null });
    useWorkspaceStore.setState({ error: null });
  });

  it('profiles once on first visit and shows the overview when done', async () => {
    const view = renderTab();
    await waitFor(() => expect(profileCalls()).toHaveLength(1));

    await emit({
      job_id: 'profile-1',
      state: 'running',
      progress: 0.3,
      message: 'Finding duplicates',
    });
    expect(screen.getByRole('progressbar', { name: 'Profiling progress' })).toBeTruthy();
    await emit({
      job_id: 'profile-1',
      state: 'completed',
      result: { ...demoProfile, history_id: 'history-1' },
    });

    const summary = screen.getByRole('list', { name: 'Dataset summary' });
    expect(within(summary).getByText('7,043')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Data quality' })).toBeTruthy();

    view.rerender(
      <StrictMode>
        <WorkflowActions activeTab="Data" />
      </StrictMode>,
    );
    view.rerender(
      <StrictMode>
        <WorkflowActions activeTab="Profile" />
      </StrictMode>,
    );
    expect(profileCalls()).toHaveLength(1);
    expect(screen.getByRole('list', { name: 'Dataset summary' })).toBeTruthy();
  });

  it('cancels a first run back to the Profile dataset button without re-running', async () => {
    renderTab();
    await waitFor(() => expect(profileCalls()).toHaveLength(1));

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(invoke.mock.calls.at(-1)?.[1].request).toEqual({
        id: expect.any(String),
        method: 'job.cancel',
        params: { job_id: 'profile-1' },
      }),
    );
    await emit({ job_id: 'profile-1', state: 'cancelled' });

    expect(screen.getByRole('button', { name: 'Profile dataset' })).toBeTruthy();
    expect(profileCalls()).toHaveLength(1);
  });

  it('shows an actionable failure with Try again, only in the Profile tab', async () => {
    renderTab();
    await waitFor(() => expect(profileCalls()).toHaveLength(1));
    await emit({
      job_id: 'profile-1',
      state: 'failed',
      error: { code: 'FILE_ACCESS_ERROR', message: 'The source file can no longer be read.' },
    });

    expect(screen.getByRole('alert').textContent).toContain(
      'The source file can no longer be read.',
    );
    expect(useWorkspaceStore.getState().error).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(profileCalls()).toHaveLength(2));
  });
});
