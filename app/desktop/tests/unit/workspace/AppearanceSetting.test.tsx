import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AppearanceSetting } from '../../../src/features/settings/AppearanceSetting';
import { useAppearanceStore } from '../../../src/stores/appearanceStore';

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
  useAppearanceStore.setState({ theme: 'graphite', mode: 'system' });
});

afterEach(() => {
  cleanup();
  delete (window as Window & { localStorage?: Storage }).localStorage;
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.mode;
});

describe('appearance setting', () => {
  it('lists the four colour themes with Graphite first and selected', () => {
    render(<AppearanceSetting />);
    const group = screen.getByRole('radiogroup', { name: 'Colour theme' });
    const options = Array.from(group.querySelectorAll('input[type="radio"]')).map(
      (input) => (input as HTMLInputElement).value,
    );

    expect(options).toEqual(['graphite', 'ledger', 'paper', 'orchid']);
    expect((screen.getByRole('radio', { name: /Graphite/ }) as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it('applies and saves the chosen colour theme', () => {
    render(<AppearanceSetting />);

    fireEvent.click(screen.getByRole('radio', { name: /Paper/ }));

    expect(useAppearanceStore.getState().theme).toBe('paper');
    expect(document.documentElement.dataset.theme).toBe('paper');
    expect(storage.get('forma.color-theme')).toBe('paper');
  });

  it('applies and saves dark mode', () => {
    render(<AppearanceSetting />);
    const modes = screen.getByRole('radiogroup', { name: 'Mode' });

    fireEvent.click(modes.querySelector('input[value="dark"]')!);

    expect(useAppearanceStore.getState().mode).toBe('dark');
    expect(document.documentElement.dataset.mode).toBe('dark');
    expect(storage.get('forma.color-mode')).toBe('dark');
  });

  it('previews each theme with its own colours', () => {
    render(<AppearanceSetting />);
    const previews = document.querySelectorAll('[data-theme-preview]');
    expect(Array.from(previews).map((el) => el.getAttribute('data-theme-preview'))).toEqual([
      'graphite',
      'ledger',
      'paper',
      'orchid',
    ]);
  });
});
