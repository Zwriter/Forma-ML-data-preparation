import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { WorkflowActions } from '../../src/features/workspace/WorkflowActions';
import { useDatasetStore } from '../../src/stores/datasetStore';
import { useExportStore } from '../../src/stores/exportStore';
import { useJobStore } from '../../src/stores/jobStore';
import { useTransformationStore } from '../../src/stores/transformationStore';
import { useWorkspaceStore } from '../../src/stores/workspaceStore';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));
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
  useDatasetStore.setState({
    dataset: null,
    preview: null,
    sourceDataset: null,
    sourcePreview: null,
    history: null,
    selectedColumns: [],
  });
  useExportStore.setState({ destination: '', overwrite: false });
  useJobStore.setState({ jobs: [] });
  useTransformationStore.setState({ operations: [] });
  useWorkspaceStore.setState({
    busy: false, error: null, history: null, saveStatus: 'idle', commands: {},
  });
});

describe('desktop accessibility and responsive shell', () => {
  it.each([320, 390, 768, 1280])('keeps named controls focusable at %i px', (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Start with a dataset' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('CSV or Parquet file'), {
      target: { value: 'data.csv' },
    });
    const controls = [
      screen.getByLabelText('CSV or Parquet file'),
      screen.getByRole('button', { name: 'Browse files' }),
      screen.getByRole('button', { name: 'Open dataset' }),
    ];
    for (const control of controls) {
      expect(control.tabIndex).toBe(0);
      control.focus();
      expect(document.activeElement).toBe(control);
    }
  });

  it('shows an actionable file error', async () => {
    invoke.mockResolvedValueOnce({
      id: 'open-1',
      status: 'error',
      result: null,
      error: { code: 'UNSUPPORTED_FORMAT', message: 'Choose a CSV or Parquet file.' },
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText('CSV or Parquet file'), {
      target: { value: 'data.txt' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open dataset' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Choose a CSV or Parquet file.',
    );
  });

  it('shows pending profile state within one second', async () => {
    useDatasetStore.getState().setDataset(dataset);
    invoke.mockImplementation(async (_command: string, args: { request: { method: string } }) =>
      response(args.request.method),
    );
    render(<WorkflowActions />);
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
    render(<WorkflowActions />);
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
    render(<WorkflowActions />);
    const started = performance.now();

    fireEvent.click(screen.getByText('Export CSV'));
    await waitFor(() => expect(screen.getByText('export: Queued (progress unknown)')).toBeTruthy());

    expect(performance.now() - started).toBeLessThan(1000);
  });
});
