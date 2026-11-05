import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DatasetPreview } from '../../../src/features/explorer/DatasetPreview';
import { SchemaSummary } from '../../../src/features/explorer/SchemaSummary';
import type { Dataset, Preview } from '../../../src/types/dataset';
import { useDatasetStore } from '../../../src/stores/datasetStore';

afterEach(() => {
  cleanup();
  useDatasetStore.setState({ search: '', activeCell: null, scroll: { top: 0, left: 0 } });
});

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

  it('shares its search and selected cell through the dataset store', () => {
    useDatasetStore.setState({ search: 'kept' });
    render(
      <DatasetPreview
        dataset={dataset}
        preview={preview([{ value: 1 }, { value: 2 }])}
        selectedColumn={null}
        onSelectColumn={vi.fn()}
        onOpenColumnDetails={vi.fn()}
        selectedColumns={['value']}
        onOpenColumnSelector={vi.fn()}
        onPage={vi.fn()}
      />,
    );
    expect((screen.getByPlaceholderText(/Search preview/) as HTMLInputElement).value).toBe('kept');
    fireEvent.change(screen.getByPlaceholderText(/Search preview/), { target: { value: 'new' } });
    expect(useDatasetStore.getState().search).toBe('new');
    fireEvent.click(screen.getAllByRole('gridcell')[1]);
    expect(useDatasetStore.getState().activeCell).toEqual({ row: 1, column: 'value' });
  });

  it('marks changed cells, missing values, removed rows, and column changes without colour alone', () => {
    render(
      <DatasetPreview
        dataset={dataset}
        preview={preview([{ value: 1 }, { value: null }])}
        selectedColumn={null}
        onSelectColumn={vi.fn()}
        onOpenColumnDetails={vi.fn()}
        selectedColumns={['value']}
        onOpenColumnSelector={vi.fn()}
        onPage={vi.fn()}
        markers={{
          changed: new Map([['0:value', null]]),
          removed: new Set([1]),
          columnNotes: { value: 'Renamed from amount' },
        }}
      />,
    );
    const [changed, missing] = screen.getAllByRole('gridcell');
    expect(changed.className).toContain('cell-changed');
    // Old value, an arrow, then the new value; screen readers hear "changed to".
    expect(changed.textContent).toBe('missing → changed to 1');
    expect(changed.querySelector('.cell-after')!.textContent).toBe('1');
    expect(missing.textContent).toContain('missing');
    expect(missing.closest('tr')!.className).toContain('worksheet-removed');
    expect(missing.closest('tr')!.textContent).toContain('Removed');
    expect(screen.getByText('Renamed from amount')).toBeTruthy();
  });
});

describe('sort indicators', () => {
  const columns = [
    { name: 'city', type: 'String', nullable: true },
    { name: 'value', type: 'Int64', nullable: true },
    { name: 'other', type: 'Int64', nullable: true },
  ];
  const sorted: Preview = {
    ...preview([{ city: 'b', value: 1, other: 2 }]),
    columns,
    view: [
      { column: 'city', direction: 'descending', nulls: 'last' },
      { column: 'value', direction: 'ascending', nulls: 'first' },
    ],
  };

  function renderSorted(page: Preview) {
    render(
      <DatasetPreview
        dataset={{ ...dataset, schema: columns, columns: 3 }}
        preview={page}
        selectedColumn={null}
        selectedColumns={columns.map((item) => item.name)}
        onOpenColumnSelector={() => undefined}
        onSelectColumn={() => undefined}
        onOpenColumnDetails={() => undefined}
        onPage={() => undefined}
      />,
    );
  }

  it('shows direction and priority in text on sorted column headers', () => {
    renderSorted(sorted);

    const city = screen.getByRole('button', { name: /Show details for city/ });
    const value = screen.getByRole('button', { name: /Show details for value/ });
    expect(city.getAttribute('aria-label')).toBe(
      'Show details for city, sorted descending, priority 1',
    );
    expect(value.getAttribute('aria-label')).toBe(
      'Show details for value, sorted ascending, priority 2',
    );
    expect(city.querySelector('.column-sort')?.textContent).toContain('Descending 1');
    expect(value.querySelector('.column-sort')?.textContent).toContain('Ascending 2');
    expect(screen.getByRole('button', { name: 'Show details for other' })).toBeTruthy();
    expect(city.closest('th')?.getAttribute('aria-sort')).toBe('descending');
    expect(value.closest('th')?.getAttribute('aria-sort')).toBeNull();
  });

  it('leaves out the priority when only one column is sorted', () => {
    renderSorted({ ...sorted, view: [sorted.view![0]] });

    const city = screen.getByRole('button', { name: /Show details for city/ });
    expect(city.getAttribute('aria-label')).toBe('Show details for city, sorted descending');
    expect(city.querySelector('.column-sort')?.textContent?.trim()).toMatch(/Descending$/);
  });
});
