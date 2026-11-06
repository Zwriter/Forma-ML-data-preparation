import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { WorkflowActions } from '../../src/features/workspace/WorkflowActions';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useProfileStore } from '../../src/stores/profileStore';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';
import { demoProfile } from '../../src/services/demoProfile';
import { save } from '@tauri-apps/plugin-dialog';

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

describe('Profile columns table', () => {
  const ready = () =>
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
      hiddenColumns: [],
    });
  const rowNames = () =>
    within(screen.getByRole('table', { name: 'Column profiles' }))
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[1].textContent);

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
    ready();
  });
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    useProfileStore.setState({ entries: {}, hiddenColumns: [], chartColumns: {} });
    useDatasetStore.setState({ dataset: null, history: null, activeCell: null });
    useWorkspaceStore.setState({ notification: null });
  });

  it('combines search, filters, and sorting with a live count', () => {
    render(<WorkflowActions activeTab="Profile" />);
    expect(screen.getByRole('status').textContent).toBe('21 columns');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search columns' }), {
      target: { value: 'o' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Quality filter' }), {
      target: { value: 'needs_attention' },
    });
    expect(rowNames()).toEqual([
      'SeniorCitizen',
      'OnlineSecurity',
      'OnlineBackup',
      'MonthlyCharges',
    ]);
    expect(screen.getByRole('status').textContent).toBe('4 of 21 columns');

    const missing = screen.getByRole('columnheader', { name: 'Missing' });
    fireEvent.click(within(missing).getByRole('button'));
    expect(rowNames()).toEqual([
      'MonthlyCharges',
      'SeniorCitizen',
      'OnlineSecurity',
      'OnlineBackup',
    ]);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search columns' }), {
      target: { value: 'zzz' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('status').textContent).toBe('21 columns');
  });

  it('keeps hidden columns hidden after the dashboard remounts', () => {
    const view = render(<WorkflowActions activeTab="Profile" />);
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Examples' }));
    expect(screen.queryByRole('columnheader', { name: 'Examples' })).toBeNull();

    view.unmount();
    render(<WorkflowActions activeTab="Profile" />);
    expect(screen.queryByRole('columnheader', { name: 'Examples' })).toBeNull();
    expect(window.localStorage.getItem('forma.profile-columns')).toBe('["examples"]');
  });

  it('opens the Clean tab on the chosen column and copies names', async () => {
    const onTabChange = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<WorkflowActions activeTab="Profile" onTabChange={onTabChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Actions for tenure' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clean this column' }));
    expect(onTabChange).toHaveBeenCalledWith('Clean');
    expect(useDatasetStore.getState().activeCell?.column).toBe('tenure');

    fireEvent.click(screen.getByRole('button', { name: 'Actions for tenure' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy column name' }));
    expect(writeText).toHaveBeenCalledWith('tenure');
    await waitFor(() =>
      expect(useWorkspaceStore.getState().notification?.message).toBe('Copied "tenure".'),
    );
  });
});

describe('Profile charts', () => {
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
      chartColumns: {},
    });
  });
  afterEach(() => {
    cleanup();
    useProfileStore.setState({ entries: {}, chartColumns: {} });
    useDatasetStore.setState({ dataset: null, history: null });
  });

  it('shows all four panels', () => {
    render(<WorkflowActions activeTab="Profile" />);
    for (const name of [
      'Data quality',
      'Missing values by column',
      'Distribution of SeniorCitizen',
      'gender (categorical)',
    ])
      expect(screen.getByRole('region', { name })).toBeTruthy();
  });

  it('Show distribution switches the matching chart and focuses it', async () => {
    render(<WorkflowActions activeTab="Profile" />);

    fireEvent.click(screen.getByRole('button', { name: 'Actions for tenure' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Show distribution' }));
    const numeric = await screen.findByRole('region', { name: 'Distribution of tenure' });
    await waitFor(() => expect(document.activeElement).toBe(numeric));

    fireEvent.click(screen.getByRole('button', { name: 'Actions for Contract' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Show distribution' }));
    const category = await screen.findByRole('region', { name: 'Contract (categorical)' });
    await waitFor(() => expect(document.activeElement).toBe(category));
  });
});

describe('Exporting invalid rows', () => {
  const exportCalls = () =>
    invoke.mock.calls
      .map(([, args]) => args.request)
      .filter((request) => request.method === 'profile.export_invalid');

  beforeEach(() => {
    useDatasetStore.getState().setDataset({
      dataset_id: 'dataset-1',
      source_path: 'C:/data/telco.csv',
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
      exportJobId: null,
    });
    vi.mocked(save).mockResolvedValue('C:/out/rejected.csv');
    invoke.mockResolvedValue(reply({ job_id: 'export-1', state: 'pending' }));
  });
  afterEach(() => {
    cleanup();
    invoke.mockReset();
    useProfileStore.setState({ entries: {}, exportJobId: null });
    useDatasetStore.setState({ dataset: null, history: null });
  });

  it('exports all invalid rows from the Data quality panel', async () => {
    render(<WorkflowActions activeTab="Profile" />);
    fireEvent.click(screen.getByRole('button', { name: 'Export invalid rows' }));

    await waitFor(() => expect(exportCalls()).toHaveLength(1));
    expect(exportCalls()[0].params).toMatchObject({ column: null, data_version: 'demo-v1' });
    expect(await screen.findByText('Exporting…')).toBeTruthy();
  });

  it('exports one column from its row menu, only where it has invalid values', async () => {
    render(<WorkflowActions activeTab="Profile" />);
    fireEvent.click(screen.getByRole('button', { name: 'Actions for tenure' }));
    expect(screen.queryByRole('menuitem', { name: 'Export invalid rows' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Actions for TotalCharges' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Export invalid rows' }));
    await waitFor(() => expect(exportCalls()[0]?.params.column).toBe('TotalCharges'));
  });

  it('is unavailable while the profile is out of date', () => {
    useDatasetStore.setState({ history: { ...history, data_version: 'demo-v2' } });
    render(<WorkflowActions activeTab="Profile" />);

    const button = screen.getByRole('button', { name: 'Export invalid rows' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('title')).toBe('Refresh the profile first');
    fireEvent.click(screen.getByRole('button', { name: 'Actions for TotalCharges' }));
    expect(screen.queryByRole('menuitem', { name: 'Export invalid rows' })).toBeNull();
  });
});
