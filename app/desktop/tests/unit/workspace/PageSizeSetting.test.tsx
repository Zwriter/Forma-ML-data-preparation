import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PageSizeSetting } from '../../../src/features/settings/PageSizeSetting';
import { useSettingsStore } from '../../../src/stores/settingsStore';

afterEach(() => {
  cleanup();
  useSettingsStore.getState().setPageSize(500);
  window.localStorage.clear();
});

function field() {
  return screen.getByRole('spinbutton', { name: 'Rows per page' }) as HTMLInputElement;
}

describe('page size setting', () => {
  it('starts at 500 and saves a typed size when the field is left', () => {
    render(<PageSizeSetting />);
    expect(field().value).toBe('500');
    expect(field().getAttribute('min')).toBe('500');
    expect(field().getAttribute('max')).toBe('20000');

    // Typing passes through values below the minimum; only the finished value is saved.
    fireEvent.change(field(), { target: { value: '7' } });
    fireEvent.change(field(), { target: { value: '7000' } });
    expect(useSettingsStore.getState().pageSize).toBe(500);
    fireEvent.blur(field());

    expect(useSettingsStore.getState().pageSize).toBe(7000);
    expect(window.localStorage.getItem('forma.page-size')).toBe('7000');
  });

  it('saves on Enter and keeps the size within 500 to 20000', () => {
    render(<PageSizeSetting />);

    fireEvent.change(field(), { target: { value: '90000' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(useSettingsStore.getState().pageSize).toBe(20000);
    expect(field().value).toBe('20000');

    fireEvent.change(field(), { target: { value: '3' } });
    fireEvent.blur(field());
    expect(useSettingsStore.getState().pageSize).toBe(500);
  });

  it('warns only above 5000 rows', () => {
    render(<PageSizeSetting />);
    expect(screen.queryByRole('status')).toBeNull();

    fireEvent.change(field(), { target: { value: '5000' } });
    expect(screen.queryByRole('status')).toBeNull();

    fireEvent.change(field(), { target: { value: '5001' } });
    expect(screen.getByRole('status').textContent).toMatch(/slow/i);
    expect(field().getAttribute('aria-describedby')).toContain(screen.getByRole('status').id);
  });
});
