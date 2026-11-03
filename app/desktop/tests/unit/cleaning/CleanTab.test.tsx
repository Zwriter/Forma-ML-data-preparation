import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CleanTab } from '../../../src/features/cleaning/CleanTab';
import { useCleaningStore } from '../../../src/stores/cleaningStore';
import { useDatasetStore } from '../../../src/stores/datasetStore';
import { useWorkspaceStore } from '../../../src/stores/workspaceStore';
import type { StepType, WorksheetMarkers } from '../../../src/types/cleaning';
import type { Preview } from '../../../src/types/dataset';

const request = vi.hoisted(() => vi.fn());
vi.mock('../../../src/services/ipcClient', () => ({ request }));

const column = { name: 'TotalCharges', type: 'Float64', nullable: true };
const dataset = {
  dataset_id: 'dataset-1',
  source_path: 'source.csv',
  format: 'csv' as const,
  columns: 1,
  rows: 2,
  state: 'open',
  schema: [column],
};
const sourcePage: Preview = {
  dataset_id: 'dataset-1',
  columns: [column],
  records: [{ TotalCharges: null }, { TotalCharges: 2 }],
  offset: 0,
  limit: 100,
  total_count: 2,
};

function respond(method: string, params: Record<string, any>) {
  if (method === 'cleaning.validate')
    return {
      valid: true,
      steps: params.operations.map((_: unknown, index: number) => ({ index, valid: true })),
    };
  if (method === 'cleaning.preview')
    return {
      columns: [{ ...column, origin: 'TotalCharges' }],
      rows: [
        { values: { TotalCharges: 0 }, removed: false },
        { values: { TotalCharges: 2 }, removed: true },
      ],
      changed_cells: [{ row: 0, column: 'TotalCharges' }],
      offset: 0,
      limit: 100,
      total_count: 2,
      summary: {
        rows_before: 2,
        rows_after: 1,
        rows_removed: 1,
        values_changed: 1,
        columns_added: [],
        columns_removed: [],
        columns_renamed: [],
      },
    };
  if (method === 'cleaning.apply') return { job_id: 'clean-1', state: 'pending' };
  if (method === 'job.cancel') return { job_id: 'clean-1', state: 'cancelled' };
  throw new Error(`Unexpected ${method}`);
}

const worksheet = vi.fn((page: Preview | null, markers?: WorksheetMarkers) => (
  <div data-testid="worksheet">
    {JSON.stringify(page?.records)}
    {markers ? ` changed:${[...markers.changed]} removed:${[...markers.removed]}` : ''}
  </div>
));

function addStep(type: StepType, title: string) {
  act(() => useCleaningStore.getState().openForm(type));
  const dialog = within(screen.getByRole('dialog', { name: title }));
  if (type === 'fill_null')
    fireEvent.change(dialog.getByLabelText('Value'), { target: { value: '0' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Add step' }));
}

describe('Clean tab', () => {
  beforeEach(() => {
    request.mockImplementation(async (method: string, params: Record<string, any>) =>
      respond(method, params),
    );
    useDatasetStore.setState({
      dataset,
      preview: sourcePage,
      activeFileId: 'file-1',
      selectedColumns: ['TotalCharges'],
      search: '',
    });
  });

  afterEach(() => {
    cleanup();
    request.mockReset();
    worksheet.mockClear();
    useCleaningStore.setState({
      drafts: {},
      form: null,
      preview: null,
      previewStatus: 'idle',
      previewError: '',
      panel: 'open',
      applyJobId: null,
    });
    useDatasetStore.setState({ dataset: null, preview: null, activeFileId: null });
    useWorkspaceStore.setState({ busy: false, error: null });
  });

  it('shows only the plain worksheet until a step is added', () => {
    render(<CleanTab worksheet={worksheet} />);
    expect(screen.getByTestId('worksheet').textContent).toBe(JSON.stringify(sourcePage.records));
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByRole('button', { name: /Apply|Cancel/ })).toBeNull();
    expect(screen.queryByText(/original file stays unchanged/)).toBeNull();
    expect(request).not.toHaveBeenCalledWith('cleaning.preview', expect.anything());
  });

  it('opens the steps panel with numbered cards when a step is added', async () => {
    render(<CleanTab worksheet={worksheet} />);
    addStep('drop_duplicates', 'Remove duplicate rows');
    addStep('fill_null', 'Fill missing values');

    const panel = screen.getByRole('complementary', { name: 'Cleaning steps' });
    const cards = within(panel).getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Compare: all columns');
    expect(cards[1].textContent).toContain('Column: TotalCharges');
    expect(within(panel).getByRole('button', { name: 'Apply 2 steps' })).toBeTruthy();
    expect(within(panel).getByRole('button', { name: 'Cancel' })).toBeTruthy();
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        'cleaning.validate',
        expect.objectContaining({ dataset_id: 'dataset-1' }),
      ),
    );
  });

  it('turns the worksheet into a live preview with markers', async () => {
    render(<CleanTab worksheet={worksheet} />);
    addStep('drop_duplicates', 'Remove duplicate rows');
    expect(screen.getByRole('status').textContent).toBe('Updating preview…');
    await waitFor(() =>
      expect(screen.getByTestId('worksheet').textContent).toBe(
        '[{"TotalCharges":0},{"TotalCharges":2}] changed:0:TotalCharges removed:1',
      ),
    );
    expect(screen.getByRole('status').textContent).toBe('');
    expect(screen.queryByText(/rows removed|→/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Preview changes' })).toBeNull();
  });

  it('names the failing step and shows the unchanged worksheet', async () => {
    request.mockImplementation(async (method: string, params: Record<string, any>) => {
      if (method === 'cleaning.preview') throw new Error('Step 1: Select an existing column.');
      return respond(method, params);
    });
    render(<CleanTab worksheet={worksheet} />);
    addStep('drop_duplicates', 'Remove duplicate rows');
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Step 1: Select an existing column.',
    );
    expect(screen.getByTestId('worksheet').textContent).toBe(JSON.stringify(sourcePage.records));
    expect((screen.getByRole('button', { name: 'Add step' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('supports keyboard navigation and Escape in the panel Add step menu', () => {
    render(<CleanTab worksheet={worksheet} />);
    addStep('drop_duplicates', 'Remove duplicate rows');
    const trigger = screen.getByRole('button', { name: 'Add step' });
    fireEvent.click(trigger);
    const items = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], { key: 'ArrowUp' });
    fireEvent.keyDown(items[0], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items.at(-1));
    fireEvent.keyDown(items.at(-1)!, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes the step form on Escape without adding a step', () => {
    useCleaningStore.getState().openForm('fill_null');
    render(<CleanTab worksheet={worksheet} />);
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Fill missing values' }), {
      key: 'Escape',
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('applies enabled steps in order, then offers Stop while running', async () => {
    render(<CleanTab worksheet={worksheet} />);
    addStep('drop_duplicates', 'Remove duplicate rows');
    addStep('drop_null_rows', 'Remove rows with missing values');
    const [first] = useCleaningStore.getState().drafts['file-1'];
    act(() => useCleaningStore.getState().toggle('file-1', first.id));

    fireEvent.click(await screen.findByRole('button', { name: 'Apply 1 step' }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith('cleaning.apply', {
        dataset_id: 'dataset-1',
        operations: [
          expect.objectContaining({ type: 'drop_duplicates', enabled: false, order: 0 }),
          expect.objectContaining({ type: 'drop_null_rows', enabled: true, order: 1 }),
        ],
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Stop' }));
    await waitFor(() => expect(request).toHaveBeenCalledWith('job.cancel', { job_id: 'clean-1' }));
  });

  it('reports a failed apply start and keeps the draft', async () => {
    request.mockImplementation(async (method: string, params: Record<string, any>) => {
      if (method === 'cleaning.apply') throw new Error('Step 1: Select an existing column.');
      return respond(method, params);
    });
    render(<CleanTab worksheet={worksheet} />);
    addStep('drop_duplicates', 'Remove duplicate rows');
    fireEvent.click(screen.getByRole('button', { name: 'Apply 1 step' }));
    await waitFor(() =>
      expect(useWorkspaceStore.getState().error).toBe(
        'Cleaning failed: Step 1: Select an existing column.',
      ),
    );
    expect(useCleaningStore.getState().drafts['file-1']).toHaveLength(1);
  });

  it('discards the draft only after Cancel is confirmed, which hides the panel', () => {
    render(<CleanTab worksheet={worksheet} />);
    addStep('drop_duplicates', 'Remove duplicate rows');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep steps' }));
    expect(screen.getByRole('complementary')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard steps' }));
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(request).not.toHaveBeenCalledWith('cleaning.apply', expect.anything());
  });
});
