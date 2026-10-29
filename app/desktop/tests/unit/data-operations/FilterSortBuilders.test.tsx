import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FilterBuilder } from '../../../src/features/data-operations/FilterBuilder';
import { SortBuilder } from '../../../src/features/data-operations/SortBuilder';

const columns = [
  { name: 'name', type: 'String', nullable: true },
  { name: 'amount', type: 'Int64', nullable: false },
  { name: 'date', type: 'Date', nullable: true },
];

afterEach(cleanup);

describe('FilterBuilder', () => {
  it('keeps the workspace interactive while the popup stays open', () => {
    const onClose = vi.fn();
    const onWorkspaceAction = vi.fn();
    const { container } = render(
      <>
        <button onClick={onWorkspaceAction}>Workspace action</button>
        <FilterBuilder columns={columns} onApply={vi.fn()} onClose={onClose} />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Workspace action' }));
    fireEvent.mouseDown(container.querySelector('.dialog-backdrop')!);

    expect(onWorkspaceAction).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Filter rows' })).toBeTruthy();
  });

  it('edits multiple typed rules and submits all/any selection', () => {
    const onApply = vi.fn();
    render(<FilterBuilder columns={columns} onApply={onApply} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Filter value 1'), { target: { value: 'oak' } });
    fireEvent.click(screen.getByText('Add condition'));
    fireEvent.change(screen.getByLabelText('Filter column 2'), { target: { value: 'amount' } });
    fireEvent.change(screen.getByLabelText('Filter condition 2'), {
      target: { value: 'at_least' },
    });
    fireEvent.change(screen.getByLabelText('Filter value 2'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Filter matching mode'), { target: { value: 'any' } });
    fireEvent.click(screen.getByText('Apply filter'));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'filter_rows',
        parameters: {
          mode: 'any',
          rules: expect.arrayContaining([
            expect.objectContaining({ column: 'name', value: 'oak' }),
            expect.objectContaining({ column: 'amount', operator: 'at_least', value: '10' }),
          ]),
        },
      }),
    );
  });

  it('reports missing filter values accessibly', () => {
    render(<FilterBuilder columns={columns} onApply={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Apply filter'));
    expect(screen.getByRole('alert').textContent).toContain('enter each comparison value');
  });
});

describe('SortBuilder', () => {
  it('submits ordered keys, directions, and missing placement', () => {
    const onApply = vi.fn();
    render(<SortBuilder columns={columns} onApply={onApply} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Sort direction 1'), {
      target: { value: 'descending' },
    });
    fireEvent.click(screen.getByText('Add sort key'));
    fireEvent.change(screen.getByLabelText('Sort column 2'), { target: { value: 'amount' } });
    fireEvent.change(screen.getByLabelText('Missing values 2'), { target: { value: 'first' } });
    fireEvent.click(screen.getByText('Apply sort'));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'sort_rows',
        parameters: {
          keys: [
            expect.objectContaining({ column: 'name', direction: 'descending' }),
            expect.objectContaining({ column: 'amount', nulls: 'first' }),
          ],
        },
      }),
    );
  });

  it('rejects duplicate sort columns', () => {
    render(<SortBuilder columns={columns} onApply={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Add sort key'));
    fireEvent.change(screen.getByLabelText('Sort column 2'), { target: { value: 'name' } });
    fireEvent.click(screen.getByText('Apply sort'));
    expect(screen.getByRole('alert').textContent).toContain('different column');
  });
});
