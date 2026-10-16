import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ColumnSelector } from '../../../src/features/data-operations/ColumnSelector';

const columns = [
  { name: 'name', type: 'String', nullable: true },
  { name: 'amount', type: 'Int64', nullable: false },
  { name: 'period', type: 'Date', nullable: true },
];

describe('ColumnSelector', () => {
  it('searches, selects, clears, orders, and confirms columns', () => {
    const onConfirm = vi.fn();
    render(<ColumnSelector columns={columns} selectedColumns={['name']} onConfirm={onConfirm} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Search columns'), { target: { value: 'amount' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /amount/ }));
    fireEvent.click(screen.getByText('Clear all'));
    fireEvent.change(screen.getByLabelText('Search columns'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Select all'));
    fireEvent.click(screen.getByRole('button', { name: 'Move period up' }));
    fireEvent.click(screen.getByText('Apply columns'));
    expect(onConfirm).toHaveBeenCalledWith(['name', 'period', 'amount']);
  });

  it('rejects empty selection and closes on Escape', () => {
    const onClose = vi.fn();
    render(<ColumnSelector columns={columns} selectedColumns={[]} onConfirm={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText('Apply columns'));
    expect(screen.getByRole('alert').textContent).toContain('Select at least one column');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
