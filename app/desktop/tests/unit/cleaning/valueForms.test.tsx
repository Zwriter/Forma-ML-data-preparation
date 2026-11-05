import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { StepFormDialog } from '../../../src/features/cleaning/StepFormDialog';
import { stepCatalog } from '../../../src/features/cleaning/stepCatalog';
import type { StepType } from '../../../src/types/cleaning';

const columns = [
  { name: 'city', type: 'String', nullable: true },
  { name: 'TotalCharges', type: 'Float64', nullable: true },
];

function open(type: StepType, parameters = stepCatalog[type].defaults(columns)) {
  const onSave = vi.fn();
  render(
    <StepFormDialog
      form={{ type, editingId: null }}
      columns={columns}
      parameters={parameters}
      onSave={(parameters) => onSave(parameters)}
      onClose={vi.fn()}
    />,
  );
  return onSave;
}

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Add step' }));
const options = (label: string) =>
  within(screen.getByLabelText(label))
    .getAllByRole('option')
    .map((option) => option.textContent);

describe('value step forms', () => {
  afterEach(cleanup);

  it('offers average and median only for numeric columns', () => {
    open('fill_null');
    expect(options('Fill with')).toEqual([
      'Fixed value',
      'Most frequent value',
      'Previous value',
      'Next value',
    ]);
    fireEvent.change(screen.getByLabelText('Column'), { target: { value: 'TotalCharges' } });
    expect(options('Fill with')).toContain('Average');
    expect(options('Fill with')).toContain('Median');

    fireEvent.change(screen.getByLabelText('Fill with'), { target: { value: 'median' } });
    fireEvent.change(screen.getByLabelText('Column'), { target: { value: 'city' } });
    expect((screen.getByLabelText('Fill with') as HTMLSelectElement).value).toBe('constant');
  });

  it('requires a fixed value and sends numbers for numeric columns', () => {
    const onSave = open('fill_null');
    fireEvent.change(screen.getByLabelText('Column'), { target: { value: 'TotalCharges' } });
    save();
    expect(screen.getByRole('alert').textContent).toBe(
      'Enter the value to fill missing cells with.',
    );
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'abc' } });
    save();
    expect(screen.getByRole('alert').textContent).toBe('Enter a number for this numeric column.');

    fireEvent.change(screen.getByLabelText('Value'), { target: { value: '0' } });
    save();
    expect(onSave).toHaveBeenCalledWith({ column: 'TotalCharges', strategy: 'constant', value: 0 });
  });

  it('omits the fixed value for other fill strategies', () => {
    const onSave = open('fill_null');
    fireEvent.change(screen.getByLabelText('Fill with'), { target: { value: 'previous' } });
    expect(screen.queryByLabelText('Value')).toBeNull();
    save();
    expect(onSave).toHaveBeenCalledWith({ column: 'city', strategy: 'previous' });
  });

  it('replaces matches with a missing value', () => {
    const onSave = open('replace_values');
    fireEvent.change(screen.getByLabelText('Find'), { target: { value: 'N/A' } });
    fireEvent.click(screen.getByLabelText('Replace with a missing value'));
    expect((screen.getByLabelText('Replace with') as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Match case'));
    save();
    expect(onSave).toHaveBeenCalledWith({
      columns: ['city'],
      find: 'N/A',
      replace: null,
      match: 'whole',
      case_sensitive: true,
    });
  });

  it('requires a column and text to find inside cells', () => {
    const onSave = open('replace_values');
    fireEvent.click(screen.getByLabelText('city'));
    save();
    expect(screen.getByRole('alert').textContent).toBe('Select at least one column.');

    fireEvent.click(screen.getByLabelText('city'));
    fireEvent.click(screen.getByLabelText('Match text inside cells'));
    save();
    expect(screen.getByRole('alert').textContent).toBe('Enter the text to find inside cells.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('converts with a chosen target type and error policy', () => {
    const onSave = open('convert_type');
    expect(options('Convert to')).toEqual([
      'Text',
      'Whole number',
      'Decimal number',
      'True/false',
      'Date',
    ]);
    fireEvent.change(screen.getByLabelText('Column'), { target: { value: 'TotalCharges' } });
    fireEvent.change(screen.getByLabelText('Convert to'), { target: { value: 'integer' } });
    fireEvent.change(screen.getByLabelText('Values that cannot be converted'), {
      target: { value: 'null' },
    });
    save();
    expect(onSave).toHaveBeenCalledWith({
      column: 'TotalCharges',
      to: 'integer',
      on_error: 'null',
    });
  });

  it('pre-fills the form when editing a step', () => {
    open('fill_null', { column: 'TotalCharges', strategy: 'constant', value: 5 });
    expect((screen.getByLabelText('Column') as HTMLSelectElement).value).toBe('TotalCharges');
    expect((screen.getByLabelText('Value') as HTMLInputElement).value).toBe('5');
  });

  it('focuses the first field and submits with Enter', () => {
    const onSave = open('convert_type');
    expect(document.activeElement).toBe(screen.getByLabelText('Column'));
    fireEvent.submit(screen.getByLabelText('Column').closest('form')!);
    expect(onSave).toHaveBeenCalledWith({ column: 'city', to: 'string', on_error: 'fail' });
  });

  it('asks for a column again when the saved one no longer exists', () => {
    const onSave = open('fill_null', { column: 'signup_date', strategy: 'mode' });
    const select = screen.getByLabelText('Column') as HTMLSelectElement;
    expect(select.selectedOptions[0].textContent).toBe('Select a column');
    save();
    expect(screen.getByRole('alert').textContent).toBe('Select a column.');
    fireEvent.change(select, { target: { value: 'city' } });
    save();
    expect(onSave).toHaveBeenCalledWith({ column: 'city', strategy: 'mode' });
  });
});
