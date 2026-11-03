import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CleanTab } from '../../../src/features/cleaning/CleanTab';
import { useCleaningStore } from '../../../src/stores/cleaningStore';
import { useDatasetStore } from '../../../src/stores/datasetStore';
import { useWorkspaceStore } from '../../../src/stores/workspaceStore';

const request = vi.hoisted(() => vi.fn());
vi.mock('../../../src/services/ipcClient', () => ({ request }));

const dataset = {
  dataset_id: 'dataset-1',
  source_path: 'source.csv',
  format: 'csv' as const,
  columns: 1,
  rows: 2,
  state: 'open',
  schema: [{ name: 'TotalCharges', type: 'Float64', nullable: true }],
};

function respond(method: string, params: Record<string, any>) {
  if (method === 'cleaning.validate')
    return {
      valid: true,
      steps: params.operations.map((_: unknown, index: number) => ({ index, valid: true })),
    };
  if (method === 'cleaning.apply') return { job_id: 'clean-1', state: 'pending' };
  if (method === 'job.cancel') return { job_id: 'clean-1', state: 'cancelled' };
  throw new Error(`Unexpected ${method}`);
}

function addStep(title: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Add step' }));
  fireEvent.click(screen.getByRole('menuitem', { name: title }));
  const dialog = within(screen.getByRole('dialog', { name: title }));
  if (title === 'Fill missing values')
    fireEvent.change(dialog.getByLabelText('Value'), { target: { value: '0' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Add step' }));
}

describe('Clean tab', () => {
  beforeEach(() => {
    request.mockImplementation(async (method: string, params: Record<string, any>) =>
      respond(method, params),
    );
    useDatasetStore.setState({ dataset, activeFileId: 'file-1' });
  });

  afterEach(() => {
    cleanup();
    request.mockReset();
    useCleaningStore.setState({ drafts: {}, form: null, preview: null, applyJobId: null });
    useDatasetStore.setState({ dataset: null, activeFileId: null });
    useWorkspaceStore.setState({ busy: false, error: null });
  });

  it('starts empty and explains that the original file stays unchanged', () => {
    render(<CleanTab />);
    expect(screen.getByText(/No cleaning steps yet/)).toBeTruthy();
    expect(screen.getByText(/original file stays unchanged/)).toBeTruthy();
    expect(screen.getByText('0 steps')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Apply 0 steps' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('adds steps from the menu as numbered cards with a readable summary', async () => {
    render(<CleanTab />);
    addStep('Remove duplicate rows');
    addStep('Fill missing values');

    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('1');
    expect(cards[0].textContent).toContain('Remove duplicate rows');
    expect(cards[0].textContent).toContain('Compare: all columns');
    expect(cards[1].textContent).toContain('Column: TotalCharges');
    expect(screen.getByText('2 steps')).toBeTruthy();
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        'cleaning.validate',
        expect.objectContaining({ dataset_id: 'dataset-1' }),
      ),
    );
  });

  it('supports keyboard navigation and Escape in the Add step menu', () => {
    render(<CleanTab />);
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
    render(<CleanTab />);
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Fill missing values' }), {
      key: 'Escape',
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('applies enabled steps in order, then offers Stop while running', async () => {
    render(<CleanTab />);
    addStep('Remove duplicate rows');
    addStep('Remove rows with missing values');
    const [first] = useCleaningStore.getState().drafts['file-1'];
    useCleaningStore.getState().toggle('file-1', first.id);

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
    render(<CleanTab />);
    addStep('Remove duplicate rows');
    fireEvent.click(screen.getByRole('button', { name: 'Apply 1 step' }));
    await waitFor(() =>
      expect(useWorkspaceStore.getState().error).toBe(
        'Cleaning failed: Step 1: Select an existing column.',
      ),
    );
    expect(useCleaningStore.getState().drafts['file-1']).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Apply 1 step' })).toBeTruthy();
  });

  it('discards the draft only after Cancel is confirmed', () => {
    render(<CleanTab />);
    addStep('Remove duplicate rows');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep steps' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard steps' }));
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(request).not.toHaveBeenCalledWith('cleaning.apply', expect.anything());
  });
});
