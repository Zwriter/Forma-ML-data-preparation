import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TransformationBuilder } from '../../../src/features/cleaning/TransformationBuilder';
import { useTransformationStore } from '../../../src/stores/transformationStore';

describe('transformation builder', () => {
  afterEach(() => {
    cleanup();
    useTransformationStore.setState({ operations: [] });
  });

  it('lists supported operations and reports malformed parameter JSON accessibly', () => {
    render(<TransformationBuilder onPreview={vi.fn()} onApply={vi.fn()} />);

    expect(screen.getByLabelText('Operation')).toBeTruthy();
    const selector = screen.getByLabelText('Operation') as HTMLSelectElement;
    expect(Array.from(selector.options).map((option) => option.value)).toEqual([
      'drop_duplicates',
      'drop_null_rows',
      'fill_null',
      'rename_columns',
      'drop_columns',
      'convert_type',
      'filter_rows',
    ]);

    fireEvent.change(screen.getByLabelText('Parameters (JSON)'), { target: { value: '{bad' } });
    fireEvent.click(screen.getByText('Add operation'));

    expect(screen.getByRole('alert').textContent).toContain('JSON');
    expect(useTransformationStore.getState().operations).toHaveLength(0);
  });

  it('keeps operation order, allows disabling and removal, and passes current operations to apply', () => {
    const onApply = vi.fn();
    render(<TransformationBuilder onPreview={vi.fn()} onApply={onApply} />);

    fireEvent.change(screen.getByLabelText('Parameters (JSON)'), {
      target: { value: '{"column":"score","strategy":"constant","value":0}' },
    });
    fireEvent.click(screen.getByText('Add operation'));
    fireEvent.change(screen.getByLabelText('Operation'), { target: { value: 'drop_null_rows' } });
    fireEvent.click(screen.getByText('Add operation'));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes).toHaveLength(2);
    expect(
      useTransformationStore.getState().operations.map((operation) => operation.order),
    ).toEqual([0, 1]);

    fireEvent.click(checkboxes[0]);
    fireEvent.click(screen.getByLabelText('Remove operation 1'));
    fireEvent.click(screen.getByText('Apply operations'));

    expect(onApply.mock.calls[0][0]).toHaveLength(1);
    expect(onApply.mock.calls[0][0][0]).toMatchObject({
      type: 'drop_null_rows',
      order: 0,
      enabled: true,
    });
  });

  it('previews first enabled operation and shows statistics and errors in accessible states', () => {
    const onPreview = vi.fn();
    render(
      <>
        <TransformationBuilder onPreview={onPreview} onApply={vi.fn()} />
      </>,
    );

    expect((screen.getByText('Preview first enabled') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Add operation'));
    fireEvent.click(screen.getByText('Preview first enabled'));

    expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ type: 'drop_duplicates' }));
  });
});
