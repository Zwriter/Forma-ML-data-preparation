import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GroupBuilder } from '../../../src/features/data-operations/GroupBuilder';
import { PivotBuilder } from '../../../src/features/data-operations/PivotBuilder';
import { UnpivotBuilder } from '../../../src/features/data-operations/UnpivotBuilder';

const columns = [
  { name: 'team', type: 'String', nullable: false },
  { name: 'period', type: 'String', nullable: false },
  { name: 'sales', type: 'Int64', nullable: true },
  { name: 'Jan', type: 'Int64', nullable: true },
  { name: 'Feb', type: 'Int64', nullable: true },
];

afterEach(cleanup);

describe('reshape builders', () => {
  it('builds grouped summaries with multiple named calculations', () => {
    const onApply = vi.fn();
    render(<GroupBuilder columns={columns} onApply={onApply} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Group by team' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Group by period' }));
    fireEvent.change(screen.getByLabelText('Calculation 1'), { target: { value: 'sum' } });
    fireEvent.change(screen.getByLabelText('Summary column name 1'), {
      target: { value: 'total_sales' },
    });
    fireEvent.click(screen.getByText('Add calculation'));
    fireEvent.change(screen.getByLabelText('Calculation 2'), { target: { value: 'count' } });
    fireEvent.change(screen.getByLabelText('Summary column name 2'), {
      target: { value: 'records' },
    });
    fireEvent.click(screen.getByText('Apply summary'));
    expect(onApply).toHaveBeenCalledWith({
      type: 'group_by',
      parameters: {
        group_columns: ['period'],
        aggregations: [
          { column: 'sales', function: 'sum', output_name: 'total_sales' },
          { column: null, function: 'count', output_name: 'records' },
        ],
      },
    });
  });

  it('requires grouping and unique output names', () => {
    const onApply = vi.fn();
    render(<GroupBuilder columns={columns} onApply={onApply} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Group by team' }));
    fireEvent.click(screen.getByText('Apply summary'));
    expect(screen.getByRole('alert').textContent).toContain('grouping column');
    expect(onApply).not.toHaveBeenCalled();
  });

  it('assigns separate row, category, value, and calculation roles for pivot', () => {
    const onApply = vi.fn();
    render(<PivotBuilder columns={columns} onApply={onApply} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Pivot category'), { target: { value: 'period' } });
    fireEvent.change(screen.getByLabelText('Pivot value'), { target: { value: 'sales' } });
    fireEvent.change(screen.getByLabelText('Pivot calculation'), { target: { value: 'average' } });
    fireEvent.click(screen.getByText('Apply pivot'));
    expect(onApply).toHaveBeenCalledWith({
      type: 'pivot',
      parameters: {
        row_columns: ['team'],
        category_column: 'period',
        value_column: 'sales',
        function: 'average',
      },
    });
  });

  it('validates incompatible pivot roles before apply', () => {
    const onApply = vi.fn();
    render(<PivotBuilder columns={columns} onApply={onApply} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Pivot value'), { target: { value: 'period' } });
    fireEvent.click(screen.getByText('Apply pivot'));
    expect(screen.getByRole('alert').textContent).toContain('different columns');
    expect(onApply).not.toHaveBeenCalled();
  });

  it('selects unpivot identifiers and values with separate output names', () => {
    const onApply = vi.fn();
    render(<UnpivotBuilder columns={columns} onApply={onApply} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Attribute column name'), {
      target: { value: 'month' },
    });
    fireEvent.change(screen.getByLabelText('Value column name'), { target: { value: 'amount' } });
    fireEvent.click(screen.getByText('Apply unpivot'));
    expect(onApply).toHaveBeenCalledWith({
      type: 'unpivot',
      parameters: {
        identifier_columns: ['team'],
        value_columns: ['sales', 'Jan', 'Feb'],
        attribute_name: 'month',
        value_name: 'amount',
      },
    });
  });

  it('rejects unpivot without identifiers or values', () => {
    const onApply = vi.fn();
    render(<UnpivotBuilder columns={columns} onApply={onApply} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Identifier team' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Unpivot value Jan' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Unpivot value Feb' }));
    fireEvent.click(screen.getByText('Apply unpivot'));
    expect(screen.getByRole('alert').textContent).toContain('identifier and value column');
    expect(onApply).not.toHaveBeenCalled();
  });

  it('exposes busy state and blocks duplicate reshape submissions', () => {
    const onApply = vi.fn();
    render(<PivotBuilder columns={columns} busy onApply={onApply} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
    expect(screen.getByRole('button', { name: 'Applying…' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Applying…' }));
    expect(onApply).not.toHaveBeenCalled();
  });

  it('shows actionable validation when no columns are available', () => {
    const onApply = vi.fn();
    render(<GroupBuilder columns={[]} onApply={onApply} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Apply summary'));
    expect(screen.getByRole('alert').textContent).toContain('grouping column');
    expect(onApply).not.toHaveBeenCalled();
  });
});
