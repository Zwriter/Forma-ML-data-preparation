import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DatasetPreview } from '../../../src/features/explorer/DatasetPreview';
import { SchemaSummary } from '../../../src/features/explorer/SchemaSummary';
import type { Dataset, Preview } from '../../../src/types/dataset';

afterEach(cleanup);

const column = { name: 'value', type: 'Int64', nullable: true };

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
    render(<DatasetPreview preview={preview([])} onPage={() => undefined} />);

    expect(screen.getByText('This dataset has no records to preview.')).toBeTruthy();
    expect((screen.getByText('Previous') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('Next') as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders bounded rows and requests the next page', () => {
    const onPage = vi.fn();
    render(
      <DatasetPreview
        preview={preview(Array.from({ length: 100 }, (_, value) => ({ value })))}
        onPage={onPage}
      />,
    );

    expect(screen.getAllByRole('row')).toHaveLength(101);
    fireEvent.click(screen.getByText('Next'));

    expect(onPage).toHaveBeenCalledWith(100);
  });

  it('requests previous page and does not page beyond known total', () => {
    const onPage = vi.fn();
    const { rerender } = render(
      <DatasetPreview preview={preview([{ value: 100 }], 100, 101)} onPage={onPage} />,
    );

    fireEvent.click(screen.getByText('Previous'));
    expect(onPage).toHaveBeenCalledWith(0);
    expect((screen.getByText('Next') as HTMLButtonElement).disabled).toBe(true);

    rerender(<DatasetPreview preview={preview([{ value: 100 }], 100, null)} onPage={onPage} />);
    expect(screen.getByText('Rows 101–101 of unknown')).toBeTruthy();
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

    render(<SchemaSummary dataset={dataset} />);

    expect(screen.getByText('Unknown')).toBeTruthy();
    expect(screen.getByText('source.csv')).toBeTruthy();
    expect(screen.getByText('Int64')).toBeTruthy();
  });
});
