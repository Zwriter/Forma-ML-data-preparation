import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ColumnTableToolbar } from '../../../src/features/profiling/columns/ColumnTableToolbar';
import { ColumnSettingsMenu } from '../../../src/features/profiling/columns/ColumnSettingsMenu';

describe('ColumnTableToolbar', () => {
  afterEach(cleanup);

  it('reports search and filter changes and shows the count', () => {
    const onChange = vi.fn();
    render(
      <ColumnTableToolbar
        filter={{ search: '', type: 'all', quality: 'all' }}
        count="3 of 21 columns"
        onChange={onChange}
        settings={null}
      />,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search columns' }), {
      target: { value: 'charge' },
    });
    expect(onChange).toHaveBeenLastCalledWith({ search: 'charge', type: 'all', quality: 'all' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Type filter' }), {
      target: { value: 'integer' },
    });
    expect(onChange).toHaveBeenLastCalledWith({ search: '', type: 'integer', quality: 'all' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Quality filter' }), {
      target: { value: 'poor' },
    });
    expect(onChange).toHaveBeenLastCalledWith({ search: '', type: 'all', quality: 'poor' });
    expect(screen.getByRole('status').textContent).toBe('3 of 21 columns');
  });
});

describe('ColumnSettingsMenu', () => {
  afterEach(cleanup);

  it('toggles optional columns from checkbox items and stays open', () => {
    const onToggle = vi.fn();
    render(<ColumnSettingsMenu hidden={['examples']} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
    const examples = screen.getByRole('menuitemcheckbox', { name: 'Examples' });
    expect(examples.getAttribute('aria-checked')).toBe('false');
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Quality' }).getAttribute('aria-checked'),
    ).toBe('true');
    expect(screen.getAllByRole('menuitemcheckbox')).toHaveLength(6);

    fireEvent.click(examples);
    expect(onToggle).toHaveBeenCalledWith('examples');
    expect(screen.getByRole('menu', { name: 'Visible columns' })).toBeTruthy();

    fireEvent.keyDown(examples, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Table settings' }));
  });
});
