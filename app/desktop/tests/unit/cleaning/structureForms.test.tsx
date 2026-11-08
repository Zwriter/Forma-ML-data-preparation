import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
const options = (select: HTMLElement) =>
  within(select)
    .getAllByRole('option')
    .map((option) => option.textContent);
/** The message sits under its field, which is marked invalid and points at it. */
function expectFieldError(field: HTMLElement, message: string) {
  const alert = screen.getByRole('alert');
  expect(alert.textContent).toBe(message);
  expect(field.getAttribute('aria-invalid')).toBe('true');
  expect(field.getAttribute('aria-describedby')).toBe(alert.id);
}
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

  it('renames columns picked from a dropdown, one row each', () => {
    const onSave = open('rename_columns');
    const row = (n: number) => within(screen.getByRole('group', { name: `Rename ${n}` }));
    expect((row(1).getByLabelText('Column') as HTMLSelectElement).value).toBe('full_name');
    save();
    expectFieldError(row(1).getByLabelText('New name'), 'Enter a new name.');
    expect(document.activeElement).toBe(row(1).getByLabelText('New name'));

    fireEvent.change(row(1).getByLabelText('New name'), { target: { value: ' Name ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add column' }));
    expect(options(row(2).getByLabelText('Column'))).toEqual(['city', 'country']);
    fireEvent.change(row(2).getByLabelText('Column'), { target: { value: 'country' } });
    fireEvent.change(row(2).getByLabelText('New name'), { target: { value: 'Name' } });
    save();
    expectFieldError(row(2).getByLabelText('New name'), 'Column name "Name" is already used.');

    fireEvent.change(row(2).getByLabelText('New name'), { target: { value: 'nation' } });
    save();
    expect(onSave).toHaveBeenCalledWith(
      { mapping: { full_name: 'Name', country: 'nation' } },
      'rename_columns',
    );
  });

  it('removes a rename row and keeps rows complete and distinct', () => {
    const onSave = open('rename_columns', { mapping: { full_name: 'name', city: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove rename 2' }));
    expect(screen.queryByRole('group', { name: 'Rename 2' })).toBeNull();

    const name = screen.getByLabelText('New name');
    fireEvent.change(name, { target: { value: 'full_name' } });
    save();
    expectFieldError(name, 'Enter a name different from the current one.');
    fireEvent.change(name, { target: { value: 'city' } });
    save();
    expectFieldError(name, 'Column name "city" is already used.');
    fireEvent.change(name, { target: { value: 'x'.repeat(129) } });
    save();
    expectFieldError(name, 'Use 128 characters or fewer.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('checks a text field when the user leaves it', () => {
    open('rename_columns');
    const name = screen.getByLabelText('New name');
    fireEvent.blur(name);
    expectFieldError(name, 'Enter a new name.');
    fireEvent.change(name, { target: { value: 'person' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(name.getAttribute('aria-invalid')).toBeNull();
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
    expectFieldError(
      screen.getByLabelText('New column names (comma-separated)'),
      'Column name "first" is already used.',
    );

    type('New column names (comma-separated)', 'first, city');
    save();
    expect(alertText()).toBe('Column name "city" is already used.');

    type('New column names (comma-separated)', 'first, last');
    fireEvent.click(screen.getByLabelText('Remove the original column'));
    save();
    expect(onSave).toHaveBeenCalledWith(
      { column: 'full_name', separator: ' ', into: ['first', 'last'], drop_original: true },
      'split_column',
    );
  });

  it('extracts date parts into new named columns', () => {
    const onSave = open('extract_date_parts', {
      column: 'city',
      parts: ['year', 'month', 'day', 'weekday'],
      names: { year: 'city_year', month: 'city_month', day: 'city_day', weekday: 'city_weekday' },
    });
    type('Column', 'country');
    expect((screen.getByLabelText('Year column name') as HTMLInputElement).value).toBe(
      'country_year',
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Month' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Day' }));
    expect(screen.queryByLabelText('Month column name')).toBeNull();

    type('Weekday column name', 'city');
    save();
    expectFieldError(
      screen.getByLabelText('Weekday column name'),
      'Column name "city" is already used.',
    );
    type('Weekday column name', 'country_year');
    save();
    expect(alertText()).toBe('Column name "country_year" is already used.');

    type('Weekday column name', 'dow');
    save();
    expect(onSave).toHaveBeenLastCalledWith(
      {
        column: 'country',
        parts: ['year', 'weekday'],
        names: { year: 'country_year', weekday: 'dow' },
      },
      'extract_date_parts',
    );
  });

  it('needs at least one date part', () => {
    open('extract_date_parts', { column: 'city', parts: ['year'], names: { year: 'y' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Year' }));
    save();
    expect(alertText()).toBe('Choose at least one date part.');
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

    type('New column name', 'city');
    save();
    expectFieldError(
      screen.getByLabelText('New column name'),
      'Column name "city" is already used.',
    );

    type('New column name', 'location');
    fireEvent.click(screen.getByLabelText('Remove the source columns'));
    save();
    expect(onSave).toHaveBeenCalledWith(
      { columns: ['country', 'city'], separator: ', ', into: 'location', drop_sources: true },
      'merge_columns',
    );
  });
});
