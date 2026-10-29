import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SaveBehaviorSetting } from '../../../src/features/settings/SaveBehaviorSetting';
import { useSettingsStore } from '../../../src/stores/settingsStore';

afterEach(() => {
  cleanup();
  useSettingsStore.getState().setSaveBehavior('replace');
});

describe('save behavior setting', () => {
  it('lets the user choose saving a copy and persists the choice', () => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
    render(<SaveBehaviorSetting />);

    fireEvent.click(screen.getByRole('radio', { name: /Save a copy/ }));

    expect(useSettingsStore.getState().saveBehavior).toBe('copy');
    expect(window.localStorage.getItem('forma.save-behavior')).toBe('copy');
    delete (window as Window & { localStorage?: Storage }).localStorage;
  });
});
