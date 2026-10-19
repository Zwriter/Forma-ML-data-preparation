import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { WorkflowActions } from '../../src/features/workspace/WorkflowActions';
import { WorkspaceChrome } from '../../src/features/workspace/WorkspaceChrome';
import { SaveConfirmDialog } from '../../src/features/workspace/SaveConfirmDialog';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useExportStore } from '../../src/stores/exportStore';
import { useJobStore } from '../../src/stores/jobStore';
import { useTransformationStore } from '../../src/stores/transformationStore';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';

const invoke = vi.hoisted(() => vi.fn());
const dialogOpen = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: dialogOpen, save: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => undefined) }));

const originalWidth = window.innerWidth;
const dataset = {
  dataset_id: 'dataset-1',
  source_path: 'data.csv',
  format: 'csv' as const,
  columns: 1,
  rows: 10,
  state: 'open',
  schema: [{ name: 'x', type: 'Int64', nullable: true }],
};

function response(method: string) {
  const result =
    method === 'dataset.profile'
      ? { job_id: 'profile-1', state: 'pending' }
      : method === 'cleaning.apply'
        ? { job_id: 'clean-1', state: 'pending' }
        : { job_id: 'export-1', state: 'pending' };
  return { id: 'request-1', status: 'success', result, error: null };
}

afterEach(() => {
  cleanup();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
  invoke.mockReset();
  dialogOpen.mockReset();
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
  useJobStore.setState({ jobs: [] });
  useTransformationStore.setState({ operations: [] });
  useWorkspaceStore.setState({
    busy: false,
    error: null,
    history: null,
    saveStatus: 'idle',
    commands: {},
  });
});

describe('desktop accessibility and responsive shell', () => {
  it.each([320, 390, 768, 1280])('keeps named controls focusable at %i px', (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Start with a dataset' })).toBeTruthy();
    const controls = [screen.getByRole('button', { name: 'Import file' })];
    for (const control of controls) {
      expect(control.tabIndex).toBe(0);
      control.focus();
      expect(document.activeElement).toBe(control);
    }
  });

  it.each([320, 390, 768, 1280])('keeps Data toolbar controls usable at %i px', (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    useDatasetStore.getState().setDataset(dataset);
    const noop = () => undefined;
    const { unmount } = render(
      <WorkspaceChrome
        activeTab="Data"
        onTabChange={noop}
        onReload={noop}
        onSelectColumns={noop}
        onFilter={noop}
        onSort={noop}
        onGroup={noop}
        onPivot={noop}
        onUnpivot={noop}
        hasDataset
        onSave={noop}
        onUndo={noop}
        onRedo={noop}
        canUndo
        canRedo
      />,
    );
    for (const label of [
      'Save',
      'Undo',
      'Redo',
      'Select columns',
      'Filter row',
      'Sort',
      'Group by',
      'Pivot',
      'Unpivot',
    ]) {
      const control = screen.getByRole('button', { name: label });
      expect(control.tabIndex).toBe(0);
    }
    unmount();
  });

  it.each([
    ['filter', 'Filter rows'],
    ['sort', 'Sort rows'],
    ['group_by', 'Summarize rows'],
    ['pivot', 'Turn categories into columns'],
    ['unpivot', 'Turn columns into rows'],
  ] as const)('%s dialog exposes accessible controls', (operation, title) => {
    useDatasetStore.getState().setDataset(dataset);
    render(<WorkflowActions activeTab="Data" operationDialog={operation} />);
    const dialog = screen.getByRole('dialog', { name: title });
    expect(dialog.getAttribute('aria-modal')).toBeNull();
    const firstButton = dialog.querySelector('button');
    expect(firstButton?.tabIndex).toBe(0);
  });

  it('labels close confirmation and exposes all recovery choices', () => {
    render(
      <SaveConfirmDialog mode="close" onSave={vi.fn()} onDiscard={vi.fn()} onCancel={vi.fn()} />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Save changes before closing?' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    for (const label of ['Save', 'Discard changes', 'Cancel']) {
      expect(screen.getByRole('button', { name: label }).tabIndex).toBe(0);
    }
  });

  it('routes selected files through the import dialog', async () => {
    dialogOpen.mockResolvedValueOnce(null);
    invoke.mockResolvedValueOnce({
      id: 'open-1',
      status: 'error',
      result: null,
      error: { code: 'UNSUPPORTED_FORMAT', message: 'Choose a CSV or Parquet file.' },
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));
    await waitFor(() => expect(dialogOpen).toHaveBeenCalled());
    expect(invoke).not.toHaveBeenCalled();
  });

  it('shows pending profile state within one second', async () => {
    useDatasetStore.getState().setDataset(dataset);
    invoke.mockImplementation(async (_command: string, args: { request: { method: string } }) =>
      response(args.request.method),
    );
    render(<WorkflowActions activeTab="Profile" />);
    const started = performance.now();

    fireEvent.click(screen.getByText('Profile dataset'));
    await waitFor(() =>
      expect(screen.getByText('profile: Queued (progress unknown)')).toBeTruthy(),
    );

    expect(performance.now() - started).toBeLessThan(1000);
  });

  it('shows pending cleaning state within one second', async () => {
    useDatasetStore.getState().setDataset(dataset);
    invoke.mockImplementation(async (_command: string, args: { request: { method: string } }) =>
      response(args.request.method),
    );
    render(<WorkflowActions activeTab="Clean" />);
    fireEvent.click(screen.getByText('Add operation'));
    const started = performance.now();

    fireEvent.click(screen.getByText('Apply operations'));
    await waitFor(() => expect(screen.getByText('clean: Queued (progress unknown)')).toBeTruthy());

    expect(performance.now() - started).toBeLessThan(1000);
  });

  it('shows pending export state within one second', async () => {
    useDatasetStore.getState().setDataset(dataset);
    useExportStore.getState().setDestination('cleaned.csv');
    invoke.mockImplementation(async (_command: string, args: { request: { method: string } }) =>
      response(args.request.method),
    );
    render(<WorkflowActions activeTab="Export" />);
    const started = performance.now();

    fireEvent.click(screen.getByText('Export CSV'));
    await waitFor(() => expect(screen.getByText('export: Queued (progress unknown)')).toBeTruthy());

    expect(performance.now() - started).toBeLessThan(1000);
  });
});
