import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HistoryLimitSetting } from '../../../src/features/settings/HistoryLimitSetting';
import { useSettingsStore } from '../../../src/stores/settingsStore';

afterEach(() => {
  cleanup();
  useSettingsStore.getState().setHistoryLimit(10);
});

describe('history limit setting', () => {
  it('shows bounds and persists the selected undo depth', () => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
    render(<HistoryLimitSetting />);
    const input = screen.getByRole('spinbutton', { name: 'Actions to keep' });

    expect(input.getAttribute('min')).toBe('1');
    expect(input.getAttribute('max')).toBe('100');
    fireEvent.change(input, { target: { value: '25' } });

    expect(useSettingsStore.getState().historyLimit).toBe(25);
    expect(window.localStorage.getItem('forma.history-limit')).toBe('25');
    delete (window as Window & { localStorage?: Storage }).localStorage;
  });

  it('clamps values to configured lower and upper bounds', () => {
    const { rerender } = render(<HistoryLimitSetting />);
    const input = screen.getByRole('spinbutton', { name: 'Actions to keep' });

    fireEvent.change(input, { target: { value: '0' } });
    expect(useSettingsStore.getState().historyLimit).toBe(1);
    rerender(<HistoryLimitSetting />);
    fireEvent.change(input, { target: { value: '101' } });
    expect(useSettingsStore.getState().historyLimit).toBe(100);
  });
});
