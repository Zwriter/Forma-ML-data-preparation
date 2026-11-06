import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ColumnTable } from '../../../src/features/profiling/columns/ColumnTable';
import { demoProfile } from '../../../src/services/demoProfile';

const base = {
  columns: demoProfile.columns.slice(0, 3),
  rowCount: demoProfile.row_count,
  sort: { key: 'position', direction: 'ascending' } as const,
  hidden: [],
  onSort: vi.fn(),
  onClearFilters: vi.fn(),
  rowMenu: () => null,
};

describe('ColumnTable', () => {
  afterEach(cleanup);

  it('shows one row per column with every field', () => {
    render(<ColumnTable {...base} />);

    const table = screen.getByRole('table', { name: 'Column profiles' });
    const senior = within(table).getByText('SeniorCitizen').closest('tr')!;
    const cells = within(senior)
      .getAllByRole('cell')
      .map((cell) => cell.textContent);
    expect(cells.slice(0, 8)).toEqual([
      '3',
      'SeniorCitizen',
      '123Integer',
      '96.8%',
      '2',
      'Needs attention',
      '226 (3.2%)',
      '0, 1',
    ]);
    expect(within(senior).getByRole('meter', { name: 'Completeness 96.8%' })).toBeTruthy();
  });

  it('sorts from header buttons and marks the active sort', () => {
    const onSort = vi.fn();
    render(<ColumnTable {...base} onSort={onSort} />);

    const header = (name: string) => screen.getByRole('columnheader', { name });
    expect(header('#').getAttribute('aria-sort')).toBe('ascending');
    expect(header('Missing').getAttribute('aria-sort')).toBe('none');
    expect(within(header('Examples')).queryByRole('button')).toBeNull();

    fireEvent.click(within(header('Missing')).getByRole('button'));
    expect(onSort).toHaveBeenLastCalledWith({ key: 'missing', direction: 'descending' });
    fireEvent.click(within(header('#')).getByRole('button'));
    expect(onSort).toHaveBeenLastCalledWith({ key: 'position', direction: 'descending' });
  });

  it('hides optional columns and keeps # and name', () => {
    render(<ColumnTable {...base} hidden={['examples', 'type']} />);

    expect(screen.queryByRole('columnheader', { name: 'Examples' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Type' })).toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Column name' })).toBeTruthy();
  });

  it('offers to clear filters when nothing matches', () => {
    const onClearFilters = vi.fn();
    render(<ColumnTable {...base} columns={[]} onClearFilters={onClearFilters} />);

    expect(screen.getByText('No columns match')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });
});
