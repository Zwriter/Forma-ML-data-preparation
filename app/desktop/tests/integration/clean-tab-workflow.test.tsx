import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { WorkspaceContent } from '../../src/features/workspace/WorkspaceContent';
import { useCleaningStore } from '../../src/stores/cleaningStore';
import { useDatasetStore } from '../../src/stores/datasetStore';

// Apply, draft clearing, and failure keeping the draft are covered in profile-clean-workflow.
const request = vi.hoisted(() => vi.fn());
vi.mock('../../src/services/ipcClient', () => ({ request }));

const schema = [
  { name: 'city', type: 'String', nullable: true },
  { name: 'code', type: 'String', nullable: true },
  { name: 'population', type: 'Int64', nullable: true },
];
const dataset = {
  dataset_id: 'dataset-1',
  source_path: 'cities.csv',
  format: 'csv' as const,
  columns: 3,
  rows: 2,
  state: 'open',
  schema,
};
const page = {
  dataset_id: 'dataset-1',
  columns: schema.slice(0, 2),
  records: [{ city: 'Oslo', code: 'N/A' }],
  offset: 0,
  limit: 100,
  total_count: 1,
};

function respond(method: string, params: Record<string, any>) {
  if (method === 'cleaning.validate')
    return {
      valid: true,
      steps: params.operations.map((_: unknown, index: number) => ({ index, valid: true })),
    };
  if (method === 'cleaning.preview')
    return {
      columns: schema.slice(0, 2).map((column) => ({ ...column, origin: column.name })),
      rows: [{ values: { city: 'Oslo', code: null }, removed: false }],
      changed_cells: [{ row: 0, column: 'code', before: 'N/A' }],
      offset: 0,
      limit: 100,
      total_count: 1,
      summary: {
        rows_before: 1,
        rows_after: 1,
        rows_removed: 0,
        values_changed: 1,
        columns_added: [],
        columns_removed: [],
        columns_renamed: [],
      },
    };
  throw new Error(`Unexpected ${method}`);
}

function Workspace({ activeTab }: { activeTab: string }) {
  const { dataset: current, preview, selectedColumns } = useDatasetStore();
  return (
    <WorkspaceContent
      activeTab={activeTab}
      dataset={current}
      preview={preview}
      selectedColumns={selectedColumns}
      busy={false}
      showColumnSelector={false}
      popupPosition={{} as never}
      onShowColumnSelector={vi.fn()}
      onBack={vi.fn()}
      onBrowse={vi.fn()}
      onOpenDataset={vi.fn()}
      onPage={vi.fn()}
      onProjectColumns={vi.fn()}
    />
  );
}

describe('Clean tab workflow', () => {
  afterEach(() => {
    cleanup();
    request.mockReset();
    useCleaningStore.setState({ drafts: {}, form: null, preview: null, validation: [] });
  });

  it('carries the Data view into Clean and marks what a step changes', async () => {
    request.mockImplementation(async (method, params) => respond(method, params));
    useDatasetStore.getState().setSource(dataset, page);
    act(() => {
      useDatasetStore.getState().setSelectedColumns(['city', 'code']);
      useDatasetStore.getState().setView({ search: 'Oslo' });
    });
    const { rerender } = render(<Workspace activeTab="Data" />);
    expect(screen.getByText('N/A')).toBeTruthy();

    rerender(<Workspace activeTab="Clean" />);
    expect((screen.getByPlaceholderText(/Search preview/) as HTMLInputElement).value).toBe('Oslo');
    act(() => useCleaningStore.getState().openForm('replace_values'));
    const dialog = within(screen.getByRole('dialog', { name: 'Replace values' }));
    fireEvent.click(dialog.getByLabelText('code'));
    fireEvent.change(dialog.getByLabelText('Find'), { target: { value: 'N/A' } });
    fireEvent.click(dialog.getByLabelText('Replace with a missing value'));
    fireEvent.click(dialog.getByRole('button', { name: 'Add step' }));

    const changed = await screen.findByText('changed to', { exact: false });
    expect(changed.closest('td')?.textContent).toBe('N/A → changed to missing');
    expect(screen.getByRole('complementary', { name: 'Cleaning steps' })).toBeTruthy();
    const preview = request.mock.calls.find(([method]) => method === 'cleaning.preview');
    expect(preview?.[1]).toMatchObject({
      dataset_id: 'dataset-1',
      columns: ['city', 'code'],
      search: 'Oslo',
      operations: [expect.objectContaining({ type: 'replace_values' })],
    });
  });
});
