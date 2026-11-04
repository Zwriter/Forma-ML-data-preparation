import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StepFormDialog } from '../../../src/features/cleaning/StepFormDialog';
import { stepCatalog } from '../../../src/features/cleaning/stepCatalog';
import type { StepType } from '../../../src/types/cleaning';

const columns = [
  { name: 'full_name', type: 'String', nullable: true },
  { name: 'city', type: 'String', nullable: true },
  { name: 'country', type: 'String', nullable: true },
];

function open(type: StepType, parameters = stepCatalog[type].defaults(columns)) {
  const onSave = vi.fn();
  render(
    <StepFormDialog
      form={{ type, editingId: null }}
      columns={columns}
      parameters={parameters}
      onSave={onSave}
      onClose={vi.fn()}
    />,
  );
  return onSave;
}

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Add step' }));
const alertText = () => screen.getByRole('alert').textContent;
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('structure step forms', () => {
  afterEach(cleanup);

  it('removes duplicate rows comparing all or selected columns', () => {
    const onSave = open('drop_duplicates');
    save();
    expect(onSave).toHaveBeenLastCalledWith({}, 'drop_duplicates');

    fireEvent.click(screen.getByLabelText('city'));
    save();
    expect(onSave).toHaveBeenLastCalledWith({ columns: ['city'] }, 'drop_duplicates');
  });

  it('switches the Remove form to rows with missing values', () => {
    const onSave = open('drop_duplicates');
    type('Remove', 'drop_null_rows');
    expect(screen.getByRole('heading').textContent).toBe('Remove rows with missing values');
    fireEvent.click(screen.getByLabelText('country'));
    save();
    expect(onSave).toHaveBeenCalledWith({ columns: ['country'] }, 'drop_null_rows');
  });

  it('removes columns but keeps at least one', () => {
    const onSave = open('drop_duplicates');
    type('Remove', 'drop_columns');
    save();
    expect(alertText()).toBe('Select at least one column to remove.');

    columns.forEach((column) => fireEvent.click(screen.getByLabelText(column.name)));
    save();
    expect(alertText()).toBe('Keep at least one column.');

    fireEvent.click(screen.getByLabelText('full_name'));
    save();
    expect(onSave).toHaveBeenCalledWith({ columns: ['city', 'country'] }, 'drop_columns');
  });

  it('renames columns and rejects duplicate final names', () => {
    const onSave = open('rename_columns');
    save();
    expect(alertText()).toBe('Enter a new name for at least one column.');

    type('New name for city', 'country');
    save();
    expect(alertText()).toBe('Column name "country" is used more than once.');

    type('New name for city', '  town ');
    save();
    expect(onSave).toHaveBeenCalledWith({ mapping: { city: 'town' } }, 'rename_columns');
  });

  it('splits a column into named parts', () => {
    const onSave = open('split_column');
    expect((screen.getByLabelText(/New column names/) as HTMLInputElement).value).toBe(
      'full_name_1,full_name_2',
    );
    type('Separator', '');
    save();
    expect(alertText()).toBe('Enter a separator.');

    type('Separator', ' ');
    type('New column names (comma-separated)', 'first');
    save();
    expect(alertText()).toBe('Enter at least two new column names.');

    type('New column names (comma-separated)', 'first, first');
    save();
    expect(alertText()).toBe('Column name "first" is used more than once.');

    type('New column names (comma-separated)', 'first, last');
    fireEvent.click(screen.getByLabelText('Remove the original column'));
    save();
    expect(onSave).toHaveBeenCalledWith(
      { column: 'full_name', separator: ' ', into: ['first', 'last'], drop_original: true },
      'split_column',
    );
  });

  it('suggests part names for the chosen split column', () => {
    open('split_column');
    type('Column', 'city');
    expect((screen.getByLabelText(/New column names/) as HTMLInputElement).value).toBe(
      'city_1,city_2',
    );
  });

  it('merges columns in the order they were picked', () => {
    const onSave = open('merge_columns', {
      columns: [],
      separator: ' ',
      into: 'merged',
      drop_sources: false,
    });
    fireEvent.click(screen.getByLabelText('country'));
    save();
    expect(alertText()).toBe('Select at least two columns to merge.');

    fireEvent.click(screen.getByLabelText('city'));
    expect(screen.getByText('Order: country, city')).toBeTruthy();
    type('Separator', ', ');
    type('New column name', ' ');
    save();
    expect(alertText()).toBe('Enter a name for the merged column.');

    type('New column name', 'location');
    fireEvent.click(screen.getByLabelText('Remove the source columns'));
    save();
    expect(onSave).toHaveBeenCalledWith(
      { columns: ['country', 'city'], separator: ', ', into: 'location', drop_sources: true },
      'merge_columns',
    );
  });
});
