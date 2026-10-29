import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DatasetPreview } from '../../../src/features/explorer/DatasetPreview';
import { SchemaSummary } from '../../../src/features/explorer/SchemaSummary';
import type { Dataset, Preview } from '../../../src/types/dataset';

afterEach(cleanup);

const column = { name: 'value', type: 'Int64', nullable: true };
const dataset: Dataset = {
  dataset_id: 'dataset-1',
  source_path: 'source.csv',
  format: 'csv',
  columns: 1,
  rows: 200,
  state: 'open',
  schema: [column],
};

function preview(
  records: Array<Record<string, unknown>>,
  offset = 0,
  totalCount: number | null = 200,
): Preview {
  return {
    dataset_id: 'dataset-1',
    columns: [column],
    records,
    offset,
    limit: 100,
    total_count: totalCount,
  };
}

describe('dataset preview', () => {
  it('shows empty state and disables both paging controls', () => {
    render(
      <DatasetPreview
        dataset={dataset}
        preview={preview([])}
        selectedColumn="value"
        selectedColumns={['value']}
        onOpenColumnSelector={() => undefined}
        onSelectColumn={() => undefined}
        onOpenColumnDetails={() => undefined}
        onPage={() => undefined}
      />,
    );

    expect(screen.getByText('This dataset has no records to preview.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Previous page' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.getByRole('button', { name: 'Next page' }).hasAttribute('disabled')).toBe(true);
  });

  it('renders bounded rows and requests the next page', () => {
    const onPage = vi.fn();
    render(
      <DatasetPreview
        dataset={dataset}
        preview={preview(Array.from({ length: 100 }, (_, value) => ({ value })))}
        selectedColumn="value"
        selectedColumns={['value']}
        onOpenColumnSelector={() => undefined}
        onSelectColumn={() => undefined}
        onOpenColumnDetails={() => undefined}
        onPage={onPage}
      />,
    );

    expect(screen.getAllByRole('row')).toHaveLength(102);
    fireEvent.click(screen.getByText('Next'));

    expect(onPage).toHaveBeenCalledWith(100);
  });

  it('selects columns on click and opens details only from the context menu', () => {
    const onSelectColumn = vi.fn();
    const onOpenColumnDetails = vi.fn();
    render(
      <DatasetPreview
        dataset={dataset}
        preview={preview([{ value: 1 }])}
        selectedColumn={null}
        selectedColumns={['value']}
        onOpenColumnSelector={() => undefined}
        onSelectColumn={onSelectColumn}
        onOpenColumnDetails={onOpenColumnDetails}
        onPage={() => undefined}
      />,
    );

    const header = screen.getByRole('button', { name: 'Show details for value' });
    fireEvent.click(header);
    expect(onSelectColumn).toHaveBeenCalledWith('value');
    expect(onOpenColumnDetails).not.toHaveBeenCalled();

    fireEvent.contextMenu(header);
    expect(onOpenColumnDetails).toHaveBeenCalledWith('value');
  });

  it('requests previous page and does not page beyond known total', () => {
    const onPage = vi.fn();
    const { rerender } = render(
      <DatasetPreview
        dataset={dataset}
        preview={preview([{ value: 100 }], 100, 101)}
        selectedColumn="value"
        selectedColumns={['value']}
        onOpenColumnSelector={() => undefined}
        onSelectColumn={() => undefined}
        onOpenColumnDetails={() => undefined}
        onPage={onPage}
      />,
    );

    fireEvent.click(screen.getByText('Previous'));
    expect(onPage).toHaveBeenCalledWith(0);
    expect(screen.getByRole('button', { name: 'Next page' }).hasAttribute('disabled')).toBe(true);

    rerender(
      <DatasetPreview
        dataset={dataset}
        preview={preview([{ value: 100 }], 100, null)}
        selectedColumn="value"
        selectedColumns={['value']}
        onOpenColumnSelector={() => undefined}
        onSelectColumn={() => undefined}
        onOpenColumnDetails={() => undefined}
        onPage={onPage}
      />,
    );
    expect(screen.getByText('Rows 101–101 of unknown')).toBeTruthy();
  });

  it('searches across the dataset and starts results from page one', async () => {
    const onPage = vi.fn();
    render(
      <DatasetPreview
        dataset={dataset}
        preview={preview([{ value: 1 }])}
        selectedColumn={null}
        selectedColumns={['value']}
        onOpenColumnSelector={() => undefined}
        onSelectColumn={() => undefined}
        onOpenColumnDetails={() => undefined}
        onPage={onPage}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Search preview rows or columns...'), {
      target: { value: 'needle' },
    });

    await waitFor(() => expect(onPage).toHaveBeenCalledWith(0, 100, 'needle'));
  });
});

describe('schema summary', () => {
  it('shows schema metadata and explicit unknown row count', () => {
    const dataset: Dataset = {
      dataset_id: 'dataset-1',
      source_path: 'source.csv',
      format: 'csv',
      columns: 1,
      rows: null,
      state: 'open',
      schema: [column],
    };

    render(<SchemaSummary dataset={dataset} visibleColumns={1} />);

    expect(screen.getByText(/Unknown rows/)).toBeTruthy();
    expect(screen.getByText('CSV')).toBeTruthy();
  });
});
